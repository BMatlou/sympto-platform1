import { HealthGoalCategory, HealthGoalPriority, HealthGoalStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateHealthGoalDto {
  @IsUUID() patientId!: string;
  @IsOptional() @IsUUID() practitionerId?: string;
  @IsOptional() @IsUUID() carePlanId?: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(HealthGoalCategory) category!: HealthGoalCategory;
  @IsOptional() @IsEnum(HealthGoalPriority) priority?: HealthGoalPriority;
  @IsOptional() @IsEnum(HealthGoalStatus) status?: HealthGoalStatus;
  @IsOptional() @IsNumberString() targetValue?: string;
  @IsOptional() @IsNumberString() currentValue?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsDateString() achievedAt?: string;

  @IsOptional() @IsString() metricType?: string;
  @IsOptional() @IsString() metricKey?: string;
  @IsOptional() @IsIn(['DAILY', 'WEEKLY', 'TOTAL']) frequency?: 'DAILY' | 'WEEKLY' | 'TOTAL';
  @IsOptional() @IsNumberString() frequencyTarget?: string;
  @IsOptional() @IsIn(['SUM', 'LATEST', 'AVERAGE', 'MIN', 'MAX']) aggregation?: 'SUM' | 'LATEST' | 'AVERAGE' | 'MIN' | 'MAX';
  @IsOptional() @IsIn(['AT_LEAST', 'AT_MOST', 'CLOSEST', 'INCREASE_TO', 'DECREASE_TO']) comparison?: 'AT_LEAST' | 'AT_MOST' | 'CLOSEST' | 'INCREASE_TO' | 'DECREASE_TO';
  @IsOptional() @IsString() guidanceText?: string;
}
