import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkPaidDto {
  /** Fonepay trace id or other provider reference. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerRef?: string;
}
