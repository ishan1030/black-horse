import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

/**
 * Fonepay payment adapter.
 *
 * Dormant until merchant credentials are added to .env:
 *   FONEPAY_MERCHANT_CODE   merchant code (PID) from Fonepay
 *   FONEPAY_SECRET_KEY      shared secret used for the DV signature
 *   FONEPAY_BASE_URL        https://dev-clientapi.fonepay.com/api (test)
 *                           https://clientapi.fonepay.com/api     (live)
 *
 * Until then, Fonepay orders stay PENDING and are marked paid manually in
 * the ERP (Orders → the payment shows "· paid" once marked).
 */
@Injectable()
export class FonepayProvider {
  private readonly logger = new Logger(FonepayProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get merchantCode(): string | undefined {
    return this.config.get<string>('FONEPAY_MERCHANT_CODE');
  }

  private get secretKey(): string | undefined {
    return this.config.get<string>('FONEPAY_SECRET_KEY');
  }

  private get baseUrl(): string {
    return this.config.get<string>('FONEPAY_BASE_URL') ?? 'https://dev-clientapi.fonepay.com/api';
  }

  get configured(): boolean {
    return Boolean(this.merchantCode && this.secretKey);
  }

  /** HMAC-SHA512 DV signature over pipe-joined request fields (Fonepay spec). */
  private sign(fields: string[]): string {
    return createHmac('sha512', this.secretKey as string)
      .update(fields.join(','))
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Builds the Fonepay web-checkout redirect for an order. The customer is
   * sent to Fonepay, pays from any member bank app, and Fonepay redirects
   * back to `returnUrl` with a PRN we then verify server-side.
   */
  buildCheckoutRequest(order: { orderNumber: string; total: string }, returnUrl: string) {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Fonepay is not configured yet — set FONEPAY_MERCHANT_CODE and FONEPAY_SECRET_KEY',
      );
    }
    const params = {
      PID: this.merchantCode as string,
      MD: 'P',
      PRN: order.orderNumber,
      AMT: order.total,
      CRN: 'NPR',
      DT: new Date().toLocaleDateString('en-US'), // MM/DD/YYYY
      R1: `Black Horse order ${order.orderNumber}`,
      R2: 'N/A',
      RU: returnUrl,
    };
    const dv = this.sign([
      params.PID, params.MD, params.PRN, params.AMT, params.CRN,
      params.DT, params.R1, params.R2, params.RU,
    ]);
    return {
      checkoutUrl: `${this.baseUrl}/merchantRequest`,
      params: { ...params, DV: dv },
    };
  }

  /**
   * Verifies a payment with Fonepay after the redirect/webhook.
   * Fonepay's verification endpoint confirms the PRN was actually paid —
   * never trust redirect parameters alone.
   */
  async verifyPayment(prn: string, amount: string): Promise<boolean> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Fonepay is not configured yet');
    }
    const params = new URLSearchParams({
      PRN: prn,
      PID: this.merchantCode as string,
      AMT: amount,
      DV: this.sign([prn, this.merchantCode as string, amount]),
    });
    const res = await fetch(`${this.baseUrl}/merchantRequest/verificationMerchant?${params}`);
    if (!res.ok) {
      this.logger.warn(`Fonepay verification responded ${res.status} for PRN ${prn}`);
      return false;
    }
    const body = await res.text();
    // Per Fonepay docs the success payload contains "success" — adjust to
    // the exact contract when live credentials arrive.
    return body.toLowerCase().includes('success');
  }
}
