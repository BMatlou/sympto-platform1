import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileRecordDto } from './dto/update-profile-record.dto';

@Injectable()
export class ProfileRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, dto: UpdateProfileRecordDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { person: { include: { personAddresses: { where: { isPrimary: true }, take: 1 } } } },
      });
      if (!user?.person) throw new NotFoundException('Profile not found.');

      if (dto.email && dto.email !== user.email) {
        const existing = await tx.user.findUnique({ where: { email: dto.email } });
        if (existing && existing.id !== user.id) throw new BadRequestException('Email address is already in use.');
      }

      const personData = {
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        preferredName: dto.preferredName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        profileImageUrl: dto.profileImageUrl,
      };

      await tx.person.update({ where: { id: user.person.id }, data: personData });
      await tx.user.update({
        where: { id: user.id },
        data: { email: dto.email, phoneNumber: dto.phoneNumber },
      });

      const hasAddressChange = [dto.addressLine1, dto.addressLine2, dto.suburb, dto.city, dto.province, dto.postalCode, dto.country].some((v) => v !== undefined);
      if (hasAddressChange) {
        const primary = user.person.personAddresses[0];
        let countryId: string | null | undefined = undefined;
        if (dto.country !== undefined) {
          const country = dto.country ? await tx.country.findFirst({ where: { name: dto.country } }) : null;
          countryId = country?.id ?? null;
        }

        const addressData = {
          line1: dto.addressLine1,
          line2: dto.addressLine2,
          suburb: dto.suburb,
          city: dto.city,
          province: dto.province,
          postalCode: dto.postalCode,
          countryId,
        };

        if (primary) {
          await tx.address.update({ where: { id: primary.addressId }, data: addressData });
        } else {
          const address = await tx.address.create({ data: { ...addressData, line1: dto.addressLine1 ?? '', city: dto.city ?? '' } });
          await tx.personAddress.create({ data: { personId: user.person.id, addressId: address.id, type: 'HOME', isPrimary: true } });
        }
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: { person: { include: { country: true, personAddresses: { where: { isPrimary: true }, take: 1, include: { address: { include: { country: true } } } } } } },
      });
    });
  }
}
