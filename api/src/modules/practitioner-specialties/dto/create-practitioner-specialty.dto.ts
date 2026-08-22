import { IsUUID } from 'class-validator';

export class CreatePractitionerSpecialtyDto {
  @IsUUID()
  practitionerId!: string;

  @IsUUID()
  specialtyId!: string;
}