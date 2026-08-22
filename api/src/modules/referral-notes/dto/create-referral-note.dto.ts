import {
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateReferralNoteDto {
  @IsUUID()
  referralId!: string;

  @IsUUID()
  authorId!: string;

  @IsString()
  note!: string;
}