import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateNotificationQueueDto {
  @IsUUID()
  notificationId!: string;

  @IsDateString()
  scheduledFor!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  attempts?: number;

  @IsOptional()
  @IsDateString()
  lastAttempt?: string;

  @IsOptional()
  @IsDateString()
  nextAttempt?: string;
}