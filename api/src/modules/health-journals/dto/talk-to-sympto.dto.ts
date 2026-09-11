import { IsString, MinLength } from 'class-validator';

export class TalkToSymptoDto {
  @IsString()
  @MinLength(2)
  message!: string;
}
