import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { LinkFamilyMemberDto } from './dto/link-family-member.dto';

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async link(dto: LinkFamilyMemberDto) {
    if (dto.ownerPatientId === dto.memberPatientId) {
      throw new BadRequestException(
        'A patient cannot be linked to themselves.',
      );
    }

    return this.prisma.familyMember.create({
      data: {
        ownerPatientId: dto.ownerPatientId,
        memberPatientId: dto.memberPatientId,
        relationship: dto.relationship,
        canViewRecords: dto.canViewRecords,
        canManageAppointments: dto.canManageAppointments,
        canReceiveAlerts: dto.canReceiveAlerts,
      },
    });
  }

  async list(ownerPatientId: string) {
    return this.prisma.familyMember.findMany({
      where: {
        ownerPatientId,
      },
      include: {
        memberPatient: {
          include: {
            person: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.familyMember.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Family member removed successfully.',
    };
  }
}