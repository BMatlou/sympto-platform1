import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ConfigureMedicationReminderDto {
  @IsBoolean()
  enabled!: boolean;

  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek!: number[];

  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  times!: string[];

  @IsOptional()
  @IsString()
  timezone?: string;
}
