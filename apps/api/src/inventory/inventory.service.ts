import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MovementInput {
  variantId: string;
  /** Positive = stock in, negative = stock out. */
  delta: number;
  type: MovementType;
  source: string;
  referenceId?: string;
  userId?: string;
  note?: string;
}

/**
 * The ONLY place stock quantities change.
 *
 * Rules (from the spec):
 *  - stock is never overwritten — every change appends an InventoryMovement
 *  - the cached ProductVariant.stockQty is updated in the same transaction
 *  - concurrent writers are detected with an optimistic guard on stockQty
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async applyMovement(
    tx: Prisma.TransactionClient,
    input: MovementInput,
  ) {
    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
    });
    if (!variant || variant.deletedAt) {
      throw new NotFoundException(`Variant ${input.variantId} not found`);
    }

    const newQty = variant.stockQty + input.delta;
    if (newQty < 0) {
      throw new ConflictException(
        `Insufficient stock for ${variant.sku}: have ${variant.stockQty}, need ${-input.delta}`,
      );
    }

    // Optimistic concurrency: only update if stockQty is still what we read.
    const updated = await tx.productVariant.updateMany({
      where: { id: variant.id, stockQty: variant.stockQty },
      data: { stockQty: newQty },
    });
    if (updated.count === 0) {
      throw new ConflictException(
        `Stock for ${variant.sku} changed concurrently — retry the operation`,
      );
    }

    return tx.inventoryMovement.create({
      data: {
        variantId: variant.id,
        previousQty: variant.stockQty,
        newQty,
        delta: input.delta,
        type: input.type,
        source: input.source,
        referenceId: input.referenceId,
        userId: input.userId,
        note: input.note,
      },
    });
  }

  /** Standalone adjustment (purchase, damage, manual correction, transfer). */
  adjust(input: MovementInput) {
    return this.prisma.$transaction((tx) => this.applyMovement(tx, input));
  }

  movements(variantId: string, take = 50) {
    return this.prisma.inventoryMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, name: true } } },
    });
  }

  lowStock() {
    return this.prisma.$queryRaw<
      Array<{ id: string; sku: string; size: string; color: string; stockQty: number; lowStockThreshold: number; productName: string }>
    >`
      SELECT v.id, v.sku, v.size, v.color, v."stockQty", v."lowStockThreshold", p.name AS "productName"
      FROM "ProductVariant" v
      JOIN "Product" p ON p.id = v."productId"
      WHERE v."deletedAt" IS NULL
        AND v."isActive" = true
        AND v."stockQty" <= v."lowStockThreshold"
      ORDER BY v."stockQty" ASC
    `;
  }
}
