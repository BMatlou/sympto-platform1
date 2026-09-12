import { IsBoolean, IsDateString, IsNumber, IsOptional } from 'class-validator';

export class RecordMedicationAdherenceDto {
  @IsNumber()
  loggedValue!: number;

  @IsBoolean()
  @IsOptional()
  taken?: boolean;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
