import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type PatientContextPermission = 'VIEW_RECORDS' | 'MANAGE_APPOINTMENTS';

@Injectable()
export class PatientContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePatientUserId(ownerUserId: string, requestedPatientId?: string, permission: PatientContextPermission = 'VIEW_RECORDS') {
    const owner = await this.prisma.patient.findUnique({ where: { userId: ownerUserId }, select: { id: true } });
    if (!owner) throw new NotFoundException('Patient profile not found for the authenticated user.');

    if (!requestedPatientId || requestedPatientId === owner.id) return ownerUserId;

    const relation = await this.prisma.familyMember.findFirst({
      where: { ownerPatientId: owner.id, memberPatientId: requestedPatientId },
      include: { memberPatient: { select: { userId: true } } },
    });

    if (!relation) throw new ForbiddenException('You are not authorised to access this family member.');
    if (permission === 'VIEW_RECORDS' && !relation.canViewRecords) throw new ForbiddenException('This family member has not granted health-record access.');
    if (permission === 'MANAGE_APPOINTMENTS' && !relation.canManageAppointments) throw new ForbiddenException('This family member has not granted appointment-management access.');

    if (!relation.memberPatient.userId) throw new NotFoundException('The selected family member does not have a linked user account.');
    return relation.memberPatient.userId;
  }
}
