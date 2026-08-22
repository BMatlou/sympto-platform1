import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './types/auth-response.interface';
import { UserType } from '@prisma/client';

import { PractitionersService } from '../practitioners/practitioners.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class AuthService {
  constructor(
  private readonly usersService: UsersService,
  private readonly practitionersService: PractitionersService,
  private readonly organizationsService: OrganizationsService,
  private readonly jwtService: JwtService,
) {}



  async register(dto: RegisterDto): Promise<AuthResponse> {
  try {
    console.log('REGISTER DTO:', dto);
    console.log('Practitioners service loaded:', !!this.practitionersService);
    console.log('Organizations service loaded:', !!this.organizationsService);

    const user = await this.usersService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,

      country: dto.country,
      province: dto.province,
      city: dto.city,

      accountType: dto.accountType,

      preferredLanguage: dto.preferredLanguage,

      medicalAuthority: dto.medicalAuthority,
      licenseNumber: dto.licenseNumber,
      profession: dto.profession,
      practiceName: dto.practiceName,

      organizationName: dto.organizationName,
      organizationType: dto.organizationType,
      registrationNumber: dto.registrationNumber,
      addressLine1: dto.addressLine1,
      postalCode: dto.postalCode,
      website: dto.website,
      organizationEmail: dto.organizationEmail,
      organizationPhone: dto.organizationPhone,

      userType:
        dto.accountType === 'PRACTITIONER'
          ? UserType.PRACTITIONER
          : dto.accountType === 'ORGANIZATION'
            ? UserType.ADMIN
            : UserType.PATIENT,
    });


    const auth = await this.createAuthResponse(user);

    await this.usersService.updateRefreshToken(
      user.id,
      auth.refreshToken,
    );

    return auth;
  } catch (error) {
    console.error('====================================');
    console.error('REGISTER FAILED');
    console.error(error);
    console.error('====================================');

    throw error;
  }
}
  

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const auth = await this.createAuthResponse(user);

await this.usersService.updateRefreshToken(
  user.id,
  auth.refreshToken,
);

return auth;
  }

  private async createAuthResponse(user: {
  id: string;
  email: string;
  userType: UserType;

  person: {
    firstName: string;
    lastName: string;
    preferredName: string | null;
  };

  roles: {
    role: {
      name: string;
      permissions: {
        permission: {
          name: string;
        };
      }[];
    };
  }[];
}): Promise<AuthResponse> {
  const roles = user.roles.map(
    (userRole) => userRole.role.name,
  );

  const permissions = user.roles.flatMap(
    (userRole) =>
      userRole.role.permissions.map(
        (permission) => permission.permission.name,
      ),
  );

  const accessToken = await this.jwtService.signAsync({
    sub: user.id,
    email: user.email,
    userType: user.userType,

    roles,
    permissions,
  });

  const refreshToken = await this.jwtService.signAsync(
    {
      sub: user.id,
      type: 'refresh',
    },
    {
      expiresIn: '7d',
    },
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      userType: user.userType,
      person: {
        firstName: user.person.firstName,
        lastName: user.person.lastName,
        preferredName: user.person.preferredName,
      },
    },
  };
}

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
  console.log('==========================');
  console.log('Refresh token received:');
  console.log(refreshToken);
  console.log('typeof =', typeof refreshToken);
  console.log('length =', refreshToken?.length);
  console.log('==========================');

  const payload = await this.jwtService.verifyAsync(refreshToken);

  if (payload.type !== 'refresh') {
    throw new UnauthorizedException('Invalid refresh token.');
  }

  const user = await this.usersService.findById(payload.sub);

  if (!user) {
    throw new UnauthorizedException('User not found.');
  }

  if (!user.refreshTokenHash) {
    throw new UnauthorizedException('Refresh token not found.');
  }

  const valid = await argon2.verify(
    user.refreshTokenHash,
    refreshToken,
  );

  if (!valid) {
    throw new UnauthorizedException('Invalid refresh token.');
  }

  const auth = await this.createAuthResponse(user);

  await this.usersService.updateRefreshToken(
    user.id,
    auth.refreshToken,
  );

  return auth;
}

async logout(userId: string) {
  await this.usersService.clearRefreshToken(userId);

  return {
    message: 'Logged out successfully',
  };
}
}