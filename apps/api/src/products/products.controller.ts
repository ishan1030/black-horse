import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.products.findAll(query);
  }

  @Public()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @Roles(AdminRole.OWNER, AdminRole.MANAGER)
  @Post()
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    const product = await this.products.create(dto);
    this.audit.log({
      userId: user.id,
      action: 'product.create',
      entity: 'Product',
      entityId: product.id,
      after: { name: product.name, slug: product.slug },
    });
    return product;
  }

  @Roles(AdminRole.OWNER, AdminRole.MANAGER)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    const product = await this.products.update(id, dto);
    this.audit.log({
      userId: user.id,
      action: 'product.update',
      entity: 'Product',
      entityId: id,
      after: dto,
    });
    return product;
  }

  @Roles(AdminRole.OWNER, AdminRole.MANAGER)
  @Post(':id/variants')
  addVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.products.addVariant(id, dto);
  }

  @Roles(AdminRole.OWNER)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const product = await this.products.remove(id);
    this.audit.log({
      userId: user.id,
      action: 'product.delete',
      entity: 'Product',
      entityId: id,
    });
    return product;
  }
}
