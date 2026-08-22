import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateSpecialtyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}