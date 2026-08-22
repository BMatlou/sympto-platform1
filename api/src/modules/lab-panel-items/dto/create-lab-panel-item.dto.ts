import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateLabPanelItemDto {
  @IsUUID()
  panelId!: string;

  @IsUUID()
  testId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}