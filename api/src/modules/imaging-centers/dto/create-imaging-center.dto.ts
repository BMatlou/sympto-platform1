import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateImagingCenterDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  practiceId?: string;

  @IsOptional()
  @IsUUID()
  addressId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}