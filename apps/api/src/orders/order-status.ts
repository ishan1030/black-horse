import { OrderStatus } from '@prisma/client';

/**
 * Order flow from the spec:
 * PENDING → CONFIRMED → PACKED → SHIPPED → DELIVERED
 * with CANCELLED / RETURNED / REFUNDED exits.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  PACKED: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  DELIVERED: [OrderStatus.RETURNED],
  RETURNED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
};

/** Statuses that put stock back on the shelf when entered. */
export const RESTOCKING_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
