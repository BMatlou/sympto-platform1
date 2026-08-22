import {
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCarePlanNoteDto {
  @IsUUID()
  carePlanId!: string;

  @IsUUID()
  authorId!: string;

  @IsString()
  note!: string;
}