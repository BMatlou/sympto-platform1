import { IsString, MaxLength, MinLength } from 'class-validator';

export class TalkToSymptoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message!: string;
}
