import {
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSpecimenContainerDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}