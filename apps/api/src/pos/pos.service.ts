import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

/** Nepal VAT, included in retail prices. */
const VAT_RATE = new Prisma.Decimal('0.13');

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  /**
   * Completes an in-store sale: prices from the database, VAT computed
   * as included 13%, one POS_SALE inventory movement per line — all in
   * one transaction.
   */
  async createSale(dto: CreateSaleDto, cashierId: string) {
    return this.prisma.$transaction(async (tx) => {
      const variantIds = dto.items.map((i) => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds }, deletedAt: null, isActive: true },
        include: { product: { select: { name: true } } },
      });
      const byId = new Map(variants.map((v) => [v.id, v]));

      let subtotal = new Prisma.Decimal(0);
      const items = dto.items.map((item) => {
        const variant = byId.get(item.variantId);
        if (!variant) {
          throw new BadRequestException(`Variant ${item.variantId} is unavailable`);
        }
        const lineTotal = variant.price.mul(item.quantity);
        subtotal = subtotal.add(lineTotal);
        return {
          variantId: variant.id,
          nameSnapshot: `${variant.product.name} — ${variant.color} ${variant.size}`,
          skuSnapshot: variant.sku,
          unitPrice: variant.price,
          quantity: item.quantity,
          lineTotal,
        };
      });

      const discount = new Prisma.Decimal(dto.discount ?? 0);
      if (discount.gt(subtotal)) {
        throw new BadRequestException('Discount cannot exceed subtotal');
      }
      const total = subtotal.sub(discount);
      // VAT included in the price: total × r / (1 + r)
      const vatAmount = total.mul(VAT_RATE).div(VAT_RATE.add(1)).toDecimalPlaces(2);

      let changeAmount: Prisma.Decimal | undefined;
      const tendered =
        dto.tenderedAmount !== undefined
          ? new Prisma.Decimal(dto.tenderedAmount)
          : undefined;
      if (tendered) {
        if (tendered.lt(total)) {
          throw new BadRequestException('Tendered amount is less than total');
        }
        changeAmount = tendered.sub(total);
      }

      const sale = await tx.inStoreSale.create({
        data: {
          saleNumber: this.generateSaleNumber(),
          cashierId,
          customerId: dto.customerId,
          subtotal,
          discount,
          vatAmount,
          total,
          paymentMethod: dto.paymentMethod,
          tenderedAmount: tendered,
          changeAmount,
          note: dto.note,
          items: { create: items },
        },
        include: { items: true },
      });

      for (const item of sale.items) {
        await this.inventory.applyMovement(tx, {
          variantId: item.variantId,
          delta: -item.quantity,
          type: MovementType.POS_SALE,
          referenceId: sale.id,
          source: 'pos',
          userId: cashierId,
        });
      }

      return sale;
    });
  }

  async findAll(query: PaginationDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.inStoreSale.findMany({
        skip: query.skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          cashier: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.inStoreSale.count(),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string) {
    const sale = await this.prisma.inStoreSale.findUnique({
      where: { id },
      include: { items: true, cashier: { select: { id: true, name: true } }, customer: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  private generateSaleNumber(): string {
    const now = new Date();
    const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 36 ** 4)
      .toString(36)
      .toUpperCase()
      .padStart(4, '0');
    return `POS-${ymd}-${rand}`;
  }
}
