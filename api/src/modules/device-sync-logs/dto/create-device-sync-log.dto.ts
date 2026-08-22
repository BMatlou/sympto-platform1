import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDeviceSyncLogDto {
  @IsUUID()
  deviceId!: string;

  @IsDateString()
  syncStartedAt!: Date;

  @IsOptional()
  @IsDateString()
  syncCompletedAt?: Date;

  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  recordsImported?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}