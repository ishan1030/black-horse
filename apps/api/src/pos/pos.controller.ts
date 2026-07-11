import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PosService } from './pos.service';

@Controller('pos/sales')
export class PosController {
  constructor(
    private readonly pos: PosService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthUser) {
    const sale = await this.pos.createSale(dto, user.id);
    this.audit.log({
      userId: user.id,
      action: 'pos.sale',
      entity: 'InStoreSale',
      entityId: sale.id,
      after: { saleNumber: sale.saleNumber, total: sale.total },
    });
    return sale;
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.pos.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pos.findOne(id);
  }
}
