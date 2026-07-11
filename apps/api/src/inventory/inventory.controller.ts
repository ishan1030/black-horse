import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  @Roles(AdminRole.OWNER, AdminRole.MANAGER)
  @Post('adjust')
  async adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthUser) {
    const movement = await this.inventory.adjust({
      variantId: dto.variantId,
      delta: dto.delta,
      type: dto.type,
      note: dto.note,
      source: 'admin',
      userId: user.id,
    });
    this.audit.log({
      userId: user.id,
      action: 'inventory.adjust',
      entity: 'ProductVariant',
      entityId: dto.variantId,
      after: { delta: dto.delta, type: dto.type, newQty: movement.newQty },
    });
    return movement;
  }

  @Get('low-stock')
  lowStock() {
    return this.inventory.lowStock();
  }

  @Get(':variantId/movements')
  movements(@Param('variantId', ParseUUIDPipe) variantId: string) {
    return this.inventory.movements(variantId);
  }
}
