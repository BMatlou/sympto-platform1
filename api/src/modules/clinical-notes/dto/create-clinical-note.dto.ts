import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateClinicalNoteDto {
  @IsUUID()
  encounterId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  note!: string;
}