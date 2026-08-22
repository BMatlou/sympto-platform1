import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateQualificationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}