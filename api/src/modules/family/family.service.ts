import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { LinkFamilyMemberDto } from './dto/link-family-member.dto';

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnerPatient(userId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient profile not found for the authenticated user.');
    return patient;
  }

  async linkForUser(userId: string, dto: LinkFamilyMemberDto) {
    const owner = await this.getOwnerPatient(userId);
    if (dto.ownerPatientId !== owner.id) throw new ForbiddenException('You can only manage family members linked to your own patient account.');
    if (dto.memberPatientId === owner.id) throw new BadRequestException('A patient cannot be linked to themselves.');

    const member = await this.prisma.patient.findUnique({ where: { id: dto.memberPatientId }, select: { id: true, userId: true } });
    if (!member?.userId) throw new NotFoundException('The selected family member must have an existing Sympto account.');

    return this.prisma.familyMember.create({
      data: {
        ownerPatientId: owner.id,
        memberPatientId: dto.memberPatientId,
        relationship: dto.relationship,
        canViewRecords: dto.canViewRecords,
        canManageAppointments: dto.canManageAppointments,
        canReceiveAlerts: dto.canReceiveAlerts,
      },
    });
  }

  async listForUser(userId: string) {
    const owner = await this.getOwnerPatient(userId);
    return this.list(owner.id);
  }

  async link(dto: LinkFamilyMemberDto) {
    if (dto.ownerPatientId === dto.memberPatientId) throw new BadRequestException('A patient cannot be linked to themselves.');
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
      where: { ownerPatientId },
      include: { memberPatient: { include: { person: true } } },
    });
  }

  async removeForUser(userId: string, id: string) {
    const owner = await this.getOwnerPatient(userId);
    const relation = await this.prisma.familyMember.findFirst({ where: { id, ownerPatientId: owner.id }, select: { id: true } });
    if (!relation) throw new NotFoundException('Family member link not found.');
    await this.prisma.familyMember.delete({ where: { id: relation.id } });
    return { message: 'Family member removed successfully.' };
  }

  async remove(id: string) {
    await this.prisma.familyMember.delete({ where: { id } });
    return { message: 'Family member removed successfully.' };
  }
}
