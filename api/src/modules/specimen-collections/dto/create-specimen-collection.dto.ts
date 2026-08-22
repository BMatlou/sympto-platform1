import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSpecimenCollectionDto {
  @IsUUID()
  specimenId!: string;

  @IsOptional()
  @IsUUID()
  practitionerId?: string;

  @IsDateString()
  collectedAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}