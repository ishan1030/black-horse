import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MovementType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { canTransition, RESTOCKING_STATUSES } from './order-status';

const STATUS_TIMESTAMP: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'confirmedAt',
  PACKED: 'packedAt',
  SHIPPED: 'shippedAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'closedAt',
  RETURNED: 'closedAt',
  REFUNDED: 'closedAt',
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  /**
   * Places an online order. Prices come from the database — never the
   * client. Stock is reserved atomically: every line item produces an
   * ONLINE_ORDER inventory movement in the same transaction.
   */
  async create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert the customer by phone.
      const customer = await tx.customer.upsert({
        where: { phone: dto.customer.phone },
        update: { name: dto.customer.name, email: dto.customer.email ?? undefined },
        create: {
          name: dto.customer.name,
          phone: dto.customer.phone,
          email: dto.customer.email,
        },
      });

      const address = await tx.address.create({
        data: { ...dto.address, customerId: customer.id },
      });

      // 2. Load variants and price the order server-side.
      const variantIds = dto.items.map((i) => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds }, deletedAt: null, isActive: true },
        include: { product: { select: { name: true } } },
      });
      const bySku = new Map(variants.map((v) => [v.id, v]));

      let subtotal = new Prisma.Decimal(0);
      const items = dto.items.map((item) => {
        const variant = bySku.get(item.variantId);
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

      // 3. Coupon (optional).
      let discount = new Prisma.Decimal(0);
      let couponId: string | undefined;
      if (dto.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: dto.couponCode } });
        const now = new Date();
        const valid =
          coupon &&
          coupon.isActive &&
          (!coupon.startsAt || coupon.startsAt <= now) &&
          (!coupon.expiresAt || coupon.expiresAt >= now) &&
          (!coupon.maxUses || coupon.usedCount < coupon.maxUses) &&
          (!coupon.minSpend || subtotal.gte(coupon.minSpend));
        if (!valid) throw new BadRequestException('Coupon is not valid for this order');
        discount =
          coupon.discountType === 'PERCENTAGE'
            ? subtotal.mul(coupon.value).div(100).toDecimalPlaces(2)
            : Prisma.Decimal.min(coupon.value, subtotal);
        couponId = coupon.id;
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const shippingFee = new Prisma.Decimal(dto.shippingFee ?? 0);
      const total = subtotal.sub(discount).add(shippingFee);

      // 4. Create the order.
      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          customerId: customer.id,
          addressId: address.id,
          subtotal,
          discount,
          shippingFee,
          total,
          couponId,
          note: dto.note,
          items: { create: items },
          payments: {
            create: { method: dto.paymentMethod, amount: total },
          },
        },
        include: { items: true, payments: true },
      });

      // 5. Reserve stock — one ledger entry per line.
      for (const item of order.items) {
        await this.inventory.applyMovement(tx, {
          variantId: item.variantId,
          delta: -item.quantity,
          type: MovementType.ONLINE_ORDER,
          referenceId: order.id,
          source: 'web',
        });
      }

      return order;
    });
  }

  async findAll(query: PaginationDto & { status?: OrderStatus }) {
    const where: Prisma.OrderWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: query.pageSize,
        orderBy: { placedAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          payments: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        address: true,
        coupon: true,
        items: { include: { variant: { select: { sku: true, stockQty: true } } } },
        payments: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Moves an order along the state machine. Restocking exits
   * (CANCELLED / RETURNED) put every line item back via RETURN movements
   * in the same transaction.
   */
  async updateStatus(id: string, next: OrderStatus, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (!canTransition(order.status, next)) {
        throw new BadRequestException(
          `Cannot move order from ${order.status} to ${next}`,
        );
      }

      if (RESTOCKING_STATUSES.includes(next)) {
        for (const item of order.items) {
          await this.inventory.applyMovement(tx, {
            variantId: item.variantId,
            delta: item.quantity,
            type: MovementType.RETURN,
            referenceId: order.id,
            source: 'admin',
            userId,
            note: `order ${order.orderNumber} → ${next}`,
          });
        }
      }

      if (next === OrderStatus.REFUNDED) {
        await tx.payment.updateMany({
          where: { orderId: order.id, status: PaymentStatus.PAID },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      const timestampField = STATUS_TIMESTAMP[next];
      return tx.order.update({
        where: { id },
        data: {
          status: next,
          ...(timestampField ? { [timestampField]: new Date() } : {}),
        },
        include: { items: true, payments: true },
      });
    });
  }

  async markPaid(orderId: string, providerRef?: string) {
    const order = await this.findOne(orderId);
    await this.prisma.payment.updateMany({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.PAID, paidAt: new Date(), providerRef },
    });
    return this.findOne(orderId);
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const ymd = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(Math.random() * 36 ** 4)
      .toString(36)
      .toUpperCase()
      .padStart(4, '0');
    return `BH-${ymd}-${rand}`;
  }
}
