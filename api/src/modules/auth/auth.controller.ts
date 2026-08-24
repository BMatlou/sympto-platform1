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
import { UsersService } from '../users/users.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body(new ValidationPipe()) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body(new ValidationPipe()) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body(new ValidationPipe()) dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /**
   * Return the authenticated account's persisted identity details.
   * The JWT intentionally only contains authentication claims, so profile
   * data must be loaded from the database rather than inferred from the JWT.
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req: Request) {
    const jwtUser = req.user as JwtUser;
    const user = await this.usersService.findById(jwtUser.sub);

    if (!user) {
      return {
        id: jwtUser.sub,
        email: jwtUser.email,
        userType: jwtUser.userType,
        person: null,
        phoneNumber: null,
      };
    }

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
      person: user.person
        ? {
            id: user.person.id,
            firstName: user.person.firstName,
            lastName: user.person.lastName,
            preferredName: user.person.preferredName,
          }
        : null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.authService.logout(user.sub);
  }
}
