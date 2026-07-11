import { MovementType } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, NotEquals } from 'class-validator';

/** Movement types an admin may create by hand — sales/returns flow through their own endpoints. */
const MANUAL_TYPES = [
  MovementType.PURCHASE,
  MovementType.DAMAGE,
  MovementType.MANUAL_ADJUSTMENT,
  MovementType.TRANSFER,
] as const;

export class AdjustStockDto {
  @IsUUID()
  variantId: string;

  @IsInt()
  @NotEquals(0)
  delta: number;

  @IsEnum(MovementType)
  @IsIn(MANUAL_TYPES as unknown as string[])
  type: MovementType;

  @IsOptional()
  @IsString()
  note?: string;
}
