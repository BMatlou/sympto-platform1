import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

import { UserType } from '@prisma/client';

function mapPractitionerType(profession?: string) {
  switch (profession?.toLowerCase()) {
    case 'doctor': return 'DOCTOR';
    case 'nurse': return 'NURSE';
    case 'pharmacist': return 'PHARMACIST';
    case 'dentist': return 'DENTIST';
    case 'psychologist': return 'PSYCHOLOGIST';
    case 'physiotherapist': return 'PHYSIOTHERAPIST';
    case 'occupational therapist': return 'OCCUPATIONAL_THERAPIST';
    case 'dietitian': return 'DIETITIAN';
    case 'radiographer': return 'RADIOGRAPHER';
    default: return 'OTHER';
  }
}

function mapOrganizationType(type?: string) {
  switch (type?.toLowerCase()) {
    case 'hospital': return 'HOSPITAL';
    case 'clinic': return 'CLINIC';
    case 'laboratory': return 'LABORATORY';
    case 'pharmacy': return 'PHARMACY';
    case 'insurance': return 'INSURANCE';
    case 'government': return 'GOVERNMENT';
    case 'ngo': return 'NGO';
    case 'university': return 'UNIVERSITY';
    case 'corporate': return 'CORPORATE';
    default: return 'OTHER';
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    console.log('CREATE USER DTO:', dto);
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new BadRequestException('Email already exists.');

    if (dto.phoneNumber) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phoneNumber: dto.phoneNumber } });
      if (existingPhone) throw new BadRequestException('Phone number already exists.');
    }

    if (dto.username) {
      const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (existingUsername) throw new BadRequestException('Username already exists.');
    }

    let roleName: string;
    switch (dto.userType) {
      case UserType.PRACTITIONER: roleName = 'PRACTITIONER'; break;
      case UserType.ADMIN: roleName = 'ADMIN'; break;
      default: roleName = 'PATIENT';
    }

    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException(`Default ${roleName} role not found.`);

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      const user = await tx.user.create({
        data: {
          personId: person.id,
          email: dto.email,
          phoneNumber: dto.phoneNumber ?? null,
          username: dto.username ?? null,
          passwordHash,
          userType: dto.userType,
        },
      });

      await tx.onboardingProgress.create({ data: { userId: user.id } });

      if (dto.userType === UserType.PATIENT) {
        await tx.patient.create({ data: { personId: person.id, userId: user.id } });
      }

      // Registration uses the same ISO-2 country code as the profile editor.
      // Keep name matching for backwards compatibility with older clients.
      const country = dto.country
        ? await tx.country.findFirst({
            where: {
              OR: [
                { iso2: dto.country.toUpperCase() },
                { name: dto.country },
              ],
            },
          })
        : null;

      const address = await tx.address.create({
        data: {
          line1: dto.addressLine1 ?? '',
          line2: dto.addressLine2 ?? null,
          suburb: dto.suburb ?? null,
          city: dto.city ?? '',
          province: dto.province ?? null,
          postalCode: dto.postalCode ?? null,
          countryId: country?.id ?? null,
        },
      });

      await tx.personAddress.create({
        data: {
          personId: person.id,
          addressId: address.id,
          type: 'HOME',
          isPrimary: true,
        },
      });

      if (dto.userType === UserType.PRACTITIONER) {
        const existingPractitioner = await tx.practitioner.findUnique({
          where: { registrationNumber: dto.licenseNumber! },
        });
        if (existingPractitioner) {
          throw new BadRequestException('Practitioner registration number already exists.');
        }

        await tx.practitioner.create({
          data: {
            personId: person.id,
            userId: user.id,
            registrationNumber: dto.licenseNumber!,
            practitionerType: mapPractitionerType(dto.profession),
            status: 'PENDING',
            practiceNumber: dto.practiceName ?? null,
          },
        });
      }

      if (dto.userType === UserType.ADMIN) {
        const existingOrganization = await tx.organization.findFirst({
          where: { registrationNumber: dto.registrationNumber! },
        });
        if (existingOrganization) {
          throw new BadRequestException('Organization registration number already exists.');
        }

        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName!,
            registrationNumber: dto.registrationNumber ?? null,
            organizationType: mapOrganizationType(dto.organizationType),
            email: dto.organizationEmail ?? null,
            phone: dto.organizationPhone ?? null,
            website: dto.website ?? null,
            addressId: address.id,
          },
        });

        await tx.organizationMember.create({
          data: { organizationId: organization.id, userId: user.id, role: 'OWNER' },
        });

        await tx.administrator.create({
          data: { personId: person.id, userId: user.id },
        });
      }

      await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });

      const createdUser = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          person: true,
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      });

      if (!createdUser) throw new NotFoundException('User was created but could not be retrieved.');
      return createdUser;
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        person: true,
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        person: true,
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username }, include: { person: true } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return (await this.prisma.user.findUnique({ where: { email } })) !== null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    return (await this.prisma.user.findUnique({ where: { username } })) !== null;
  }

  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  }
}
