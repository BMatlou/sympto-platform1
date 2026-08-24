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
import { PrismaService } from '../../database/prisma.service';

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
    private readonly prisma: PrismaService,
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
    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.sub },
      include: {
        person: {
          include: {
            country: true,
            personAddresses: {
              where: { isPrimary: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                address: {
                  include: { country: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        id: jwtUser.sub,
        email: jwtUser.email,
        userType: jwtUser.userType,
        person: null,
        phoneNumber: null,
      };
    }

    const primaryAddress = user.person?.personAddresses?.[0]?.address ?? null;

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
      person: user.person
        ? {
            id: user.person.id,
            firstName: user.person.firstName,
            middleName: user.person.middleName,
            lastName: user.person.lastName,
            preferredName: user.person.preferredName,
            profileImageUrl: user.person.profileImageUrl,
            country: user.person.country
              ? {
                  id: user.person.country.id,
                  name: user.person.country.name,
                  iso2: user.person.country.iso2,
                }
              : null,
            address: primaryAddress
              ? {
                  id: primaryAddress.id,
                  line1: primaryAddress.line1,
                  line2: primaryAddress.line2,
                  suburb: primaryAddress.suburb,
                  city: primaryAddress.city,
                  province: primaryAddress.province,
                  postalCode: primaryAddress.postalCode,
                  country: primaryAddress.country
                    ? {
                        id: primaryAddress.country.id,
                        name: primaryAddress.country.name,
                        iso2: primaryAddress.country.iso2,
                      }
                    : null,
                }
              : null,
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
