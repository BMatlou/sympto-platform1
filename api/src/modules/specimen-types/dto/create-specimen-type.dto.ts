import {
  IsString,
} from 'class-validator';

export class CreateSpecimenTypeDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;
}