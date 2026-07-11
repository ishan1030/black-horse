import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Storefront: how to pay for an order (COD note, Fonepay checkout, …). */
  @Public()
  @Get('instructions/:orderId')
  instructions(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.payments.instructions(orderId);
  }

  /**
   * Fonepay return/webhook. Public by design — verification happens
   * server-to-server with Fonepay, never trusting the caller.
   */
  @Public()
  @Post('fonepay/webhook')
  fonepayWebhook(@Body() payload: { PRN?: string; AMT?: string }) {
    return this.payments.confirmFonepay(payload);
  }

  /** ERP: payment history for an order. */
  @Get('order/:orderId')
  listForOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.payments.listForOrder(orderId);
  }
}
