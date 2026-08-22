import {
  IsDateString,
  IsOptional,
} from 'class-validator';

export class UpdateAccessLogDto {
  @IsOptional()
  @IsDateString()
  logoutAt?: Date;
}