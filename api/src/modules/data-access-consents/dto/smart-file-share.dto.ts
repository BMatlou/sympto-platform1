import { IsString, Length } from 'class-validator';

export class SmartFileShareCredentialDto {
  @IsString()
  @Length(6, 128)
  code!: string;
}
