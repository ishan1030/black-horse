import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

class OrderCustomerDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsString()
  @Matches(/^\+?[0-9\- ]{7,15}$/, { message: 'phone must be a valid number' })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class OrderAddressDto {
  @IsString()
  @MaxLength(120)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  @IsString()
  @MaxLength(60)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  province?: string;
}

class OrderItemDto {
  @IsUUID()
  variantId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer: OrderCustomerDto;

  @ValidateNested()
  @Type(() => OrderAddressDto)
  address: OrderAddressDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(PaymentMethod)
  @IsIn([PaymentMethod.COD, PaymentMethod.FONEPAY])
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
