import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Order statuses that count as realized revenue. */
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** POS + online revenue between two instants, split by channel. */
  async sales(from: Date, to: Date) {
    const [online, pos] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: { placedAt: { gte: from, lt: to }, status: { in: REVENUE_STATUSES } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.inStoreSale.aggregate({
        where: { createdAt: { gte: from, lt: to } },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const onlineTotal = online._sum.total ?? new Prisma.Decimal(0);
    const posTotal = pos._sum.total ?? new Prisma.Decimal(0);
    return {
      from,
      to,
      online: { total: onlineTotal, orders: online._count },
      pos: { total: posTotal, sales: pos._count },
      total: onlineTotal.add(posTotal),
    };
  }

  /** Revenue per day for the trailing N days (online + POS combined). */
  dailyRevenue(days = 30) {
    return this.prisma.$queryRaw<Array<{ day: Date; revenue: Prisma.Decimal }>>`
      WITH combined AS (
        SELECT "placedAt" AS at, total FROM "Order"
          WHERE status::text = ANY(${REVENUE_STATUSES.map(String)})
        UNION ALL
        SELECT "createdAt" AS at, total FROM "InStoreSale"
      )
      SELECT date_trunc('day', at) AS day, COALESCE(SUM(total), 0) AS revenue
      FROM combined
      WHERE at >= now() - make_interval(days => ${days}::int)
      GROUP BY 1
      ORDER BY 1
    `;
  }

  /**
   * Gross profit = revenue − cost of goods sold, computed from line-item
   * snapshots joined to variant cost prices.
   */
  async grossProfit(from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<
      Array<{ revenue: Prisma.Decimal; cogs: Prisma.Decimal }>
    >`
      WITH lines AS (
        SELECT oi."lineTotal" AS revenue, v."costPrice" * oi.quantity AS cogs
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "ProductVariant" v ON v.id = oi."variantId"
        WHERE o."placedAt" >= ${from} AND o."placedAt" < ${to}
          AND o.status::text = ANY(${REVENUE_STATUSES.map(String)})
        UNION ALL
        SELECT si."lineTotal", v."costPrice" * si.quantity
        FROM "InStoreSaleItem" si
        JOIN "InStoreSale" s ON s.id = si."saleId"
        JOIN "ProductVariant" v ON v.id = si."variantId"
        WHERE s."createdAt" >= ${from} AND s."createdAt" < ${to}
      )
      SELECT COALESCE(SUM(revenue), 0) AS revenue, COALESCE(SUM(cogs), 0) AS cogs
      FROM lines
    `;
    const { revenue, cogs } = rows[0];
    return { from, to, revenue, cogs, grossProfit: revenue.sub(cogs) };
  }

  /** Net profit = gross profit − expenses in the window. */
  async netProfit(from: Date, to: Date) {
    const [gross, expenses] = await Promise.all([
      this.grossProfit(from, to),
      this.prisma.expense.aggregate({
        where: { incurredOn: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
    ]);
    const expenseTotal = expenses._sum.amount ?? new Prisma.Decimal(0);
    return {
      ...gross,
      expenses: expenseTotal,
      netProfit: gross.grossProfit.sub(expenseTotal),
    };
  }

  /** Stock on hand valued at cost. */
  async inventoryValuation() {
    const rows = await this.prisma.$queryRaw<
      Array<{ units: bigint; valuation: Prisma.Decimal }>
    >`
      SELECT COALESCE(SUM("stockQty"), 0) AS units,
             COALESCE(SUM("stockQty" * "costPrice"), 0) AS valuation
      FROM "ProductVariant"
      WHERE "deletedAt" IS NULL AND "isActive" = true
    `;
    return { units: Number(rows[0].units), valuation: rows[0].valuation };
  }

  /** Best sellers by units across both channels. */
  bestSellers(from: Date, to: Date, limit = 10) {
    // ::int casts matter — SUM/COUNT return BigInt, which JSON cannot serialize.
    return this.prisma.$queryRaw<
      Array<{ productName: string; sku: string; units: number; revenue: Prisma.Decimal }>
    >`
      WITH lines AS (
        SELECT oi."variantId", oi.quantity, oi."lineTotal"
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        WHERE o."placedAt" >= ${from} AND o."placedAt" < ${to}
          AND o.status::text = ANY(${REVENUE_STATUSES.map(String)})
        UNION ALL
        SELECT si."variantId", si.quantity, si."lineTotal"
        FROM "InStoreSaleItem" si
        JOIN "InStoreSale" s ON s.id = si."saleId"
        WHERE s."createdAt" >= ${from} AND s."createdAt" < ${to}
      )
      SELECT p.name AS "productName", v.sku,
             SUM(l.quantity)::int AS units, SUM(l."lineTotal") AS revenue
      FROM lines l
      JOIN "ProductVariant" v ON v.id = l."variantId"
      JOIN "Product" p ON p.id = v."productId"
      GROUP BY p.name, v.sku
      ORDER BY units DESC
      LIMIT ${limit}
    `;
  }

  /** Lifetime value per customer, top spenders first. */
  customerLifetimeValue(limit = 20) {
    return this.prisma.$queryRaw<
      Array<{ name: string; phone: string; orders: number; lifetimeValue: Prisma.Decimal }>
    >`
      SELECT c.name, c.phone, COUNT(o.id)::int AS orders,
             COALESCE(SUM(o.total), 0) AS "lifetimeValue"
      FROM "Customer" c
      JOIN "Order" o ON o."customerId" = c.id
        AND o.status::text = ANY(${REVENUE_STATUSES.map(String)})
      GROUP BY c.id
      ORDER BY "lifetimeValue" DESC
      LIMIT ${limit}
    `;
  }
}
