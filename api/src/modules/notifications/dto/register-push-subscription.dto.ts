import { IsString } from 'class-validator';

export class RegisterPushSubscriptionDto {
  @IsString()
  subscription!: string;
}
