import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { InventoryService } from '../inventory/inventory.service';
import { ReportsService } from './reports.service';

function parseRange(fromRaw?: string, toRaw?: string): { from: Date; to: Date } {
  const to = toRaw ? new Date(toRaw) : new Date();
  const from = fromRaw
    ? new Date(fromRaw)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
    throw new BadRequestException('Invalid date range');
  }
  return { from, to };
}

@Roles(AdminRole.OWNER, AdminRole.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly inventory: InventoryService,
  ) {}

  @Get('sales')
  sales(@Query('from') from?: string, @Query('to') to?: string) {
    const range = parseRange(from, to);
    return this.reports.sales(range.from, range.to);
  }

  @Get('daily-revenue')
  dailyRevenue(@Query('days') days?: string) {
    const n = Math.min(Math.max(parseInt(days ?? '30', 10) || 30, 1), 365);
    return this.reports.dailyRevenue(n);
  }

  @Get('gross-profit')
  grossProfit(@Query('from') from?: string, @Query('to') to?: string) {
    const range = parseRange(from, to);
    return this.reports.grossProfit(range.from, range.to);
  }

  @Get('net-profit')
  netProfit(@Query('from') from?: string, @Query('to') to?: string) {
    const range = parseRange(from, to);
    return this.reports.netProfit(range.from, range.to);
  }

  @Get('inventory-valuation')
  inventoryValuation() {
    return this.reports.inventoryValuation();
  }

  @Get('low-stock')
  lowStock() {
    return this.inventory.lowStock();
  }

  @Get('best-sellers')
  bestSellers(@Query('from') from?: string, @Query('to') to?: string) {
    const range = parseRange(from, to);
    return this.reports.bestSellers(range.from, range.to);
  }

  @Get('customer-ltv')
  customerLtv() {
    return this.reports.customerLifetimeValue();
  }
}
