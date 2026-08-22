import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { Request } from 'express';
import { JwtUser } from './interfaces/jwt-user.interface';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
async register(
  @Body(new ValidationPipe()) dto: RegisterDto,
) {
  console.log('REGISTER DTO:');
  console.log(JSON.stringify(dto, null, 2));

  return this.authService.register(dto);
}

  @Post('login')
  async login(
    @Body(new ValidationPipe()) dto: LoginDto,
  ) {
    return this.authService.login(dto);
  }

  @Post('refresh')
async refresh(
  @Body(new ValidationPipe()) dto: RefreshTokenDto,
) {
  return this.authService.refreshToken(dto.refreshToken);
}

 @UseGuards(JwtAuthGuard)
@Get('profile')
async profile(@Req() req: Request) {
  return req.user as JwtUser;
}

@UseGuards(JwtAuthGuard)
@Post('logout')
async logout(@Req() req: Request) {
  const user = req.user as JwtUser;

  return this.authService.logout(user.sub);
}
}