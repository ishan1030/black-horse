import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { FonepayProvider } from './fonepay.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fonepay: FonepayProvider,
    private readonly audit: AuditService,
  ) {}

  /** Payment status + next-step instructions for the storefront. */
  async instructions(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const payment = order.payments[0];

    if (payment?.method === 'FONEPAY' && payment.status === PaymentStatus.PENDING) {
      if (this.fonepay.configured) {
        return {
          method: 'FONEPAY',
          status: payment.status,
          checkout: this.fonepay.buildCheckoutRequest(
            { orderNumber: order.orderNumber, total: order.total.toString() },
            `${process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000'}/checkout/fonepay-return`,
          ),
        };
      }
      return {
        method: 'FONEPAY',
        status: payment.status,
        manual: `Pay Rs. ${order.total} via Fonepay to Black Horse Shoe and mention order ${order.orderNumber}. We confirm by phone before dispatch.`,
      };
    }

    return {
      method: payment?.method ?? 'COD',
      status: payment?.status ?? PaymentStatus.PENDING,
      manual:
        payment?.method === 'COD'
          ? `Pay Rs. ${order.total} in cash when order ${order.orderNumber} arrives.`
          : undefined,
    };
  }

  /**
   * Fonepay return/webhook: verify the PRN with Fonepay, then mark the
   * order's payment as paid. Idempotent — repeated calls are harmless.
   */
  async confirmFonepay(payload: { PRN?: string; AMT?: string }) {
    const prn = payload.PRN?.trim();
    if (!prn) throw new BadRequestException('PRN is required');

    const order = await this.prisma.order.findUnique({
      where: { orderNumber: prn },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException(`No order ${prn}`);

    const verified = await this.fonepay.verifyPayment(prn, order.total.toString());
    if (!verified) throw new BadRequestException('Fonepay could not verify this payment');

    await this.prisma.payment.updateMany({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.PAID, paidAt: new Date(), providerRef: prn },
    });
    this.audit.log({
      action: 'payment.fonepay_verified',
      entity: 'Order',
      entityId: order.id,
      after: { prn },
    });
    return { ok: true, orderNumber: order.orderNumber };
  }

  listForOrder(orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
