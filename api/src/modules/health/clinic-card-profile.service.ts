import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface UpdateClinicCardProfileInput {
  preferredName?: string;
  dateOfBirth?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  bloodType?: string;
  rhesusFactor?: string;
  organDonor?: boolean;
  emergencyNotes?: string;
}

@Injectable()
export class ClinicCardProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, input: UpdateClinicCardProfileInput) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { userId }, select: { id: true, personId: true } });
      if (!patient) throw new NotFoundException('Patient profile not found.');

      const passport = await tx.healthPassport.findUnique({
        where: { patientId: patient.id },
        select: { id: true },
      });
      const clinicalAudits = passport
        ? await tx.auditLog.findMany({
            where: {
              entityType: 'SmartFileClinical/HEALTH_PASSPORT',
              entityId: passport.id,
              action: { in: ['CREATE', 'UPDATE'] },
              success: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { newValues: true },
          })
        : [];

      const clinicalLockedFields = new Set<string>();
      for (const audit of clinicalAudits) {
        const values =
          audit.newValues && typeof audit.newValues === 'object' && !Array.isArray(audit.newValues)
            ? (audit.newValues as Record<string, unknown>)
            : null;
        for (const field of ['bloodType', 'rhesusFactor', 'organDonor', 'emergencyNotes']) {
          if (values && Object.prototype.hasOwnProperty.call(values, field)) clinicalLockedFields.add(field);
        }
      }

      await tx.person.update({
        where: { id: patient.personId },
        data: {
          preferredName: input.preferredName,
          dateOfBirth: input.dateOfBirth !== undefined ? new Date(input.dateOfBirth) : undefined,
          gender: input.gender as any,
        },
      });
      await tx.patient.update({
        where: { id: patient.id },
        data: { heightCm: input.heightCm, weightKg: input.weightKg },
      });

      const passportData: Record<string, unknown> = {};
      if (!clinicalLockedFields.has('bloodType') && input.bloodType !== undefined) passportData.bloodType = input.bloodType;
      if (!clinicalLockedFields.has('rhesusFactor') && input.rhesusFactor !== undefined) passportData.rhesusFactor = input.rhesusFactor;
      if (!clinicalLockedFields.has('organDonor') && input.organDonor !== undefined) passportData.organDonor = input.organDonor;
      if (!clinicalLockedFields.has('emergencyNotes') && input.emergencyNotes !== undefined) passportData.emergencyNotes = input.emergencyNotes;

      if (!passport) {
        await tx.healthPassport.create({
          data: {
            patientId: patient.id,
            bloodType: passportData.bloodType as any,
            rhesusFactor: passportData.rhesusFactor as any,
            organDonor: passportData.organDonor !== undefined ? Boolean(passportData.organDonor) : false,
            emergencyNotes: passportData.emergencyNotes as string | undefined,
          },
        });
      } else if (Object.keys(passportData).length) {
        await tx.healthPassport.update({
          where: { patientId: patient.id },
          data: passportData as any,
        });
      }

      return {
        success: true,
        clinicalLocks: {
          bloodType: clinicalLockedFields.has('bloodType'),
          rhesusFactor: clinicalLockedFields.has('rhesusFactor'),
          organDonor: clinicalLockedFields.has('organDonor'),
          emergencyNotes: clinicalLockedFields.has('emergencyNotes'),
        },
      };
    });
  }
}
