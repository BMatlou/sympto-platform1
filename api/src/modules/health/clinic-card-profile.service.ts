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

      await tx.person.update({ where: { id: patient.personId }, data: { preferredName: input.preferredName, dateOfBirth: input.dateOfBirth !== undefined ? new Date(input.dateOfBirth) : undefined, gender: input.gender as any } });
      await tx.patient.update({ where: { id: patient.id }, data: { heightCm: input.heightCm, weightKg: input.weightKg } });
      await tx.healthPassport.upsert({
        where: { patientId: patient.id },
        update: { bloodType: input.bloodType as any, rhesusFactor: input.rhesusFactor as any, organDonor: input.organDonor !== undefined ? input.organDonor : undefined, emergencyNotes: input.emergencyNotes },
        create: { patientId: patient.id, bloodType: input.bloodType as any, rhesusFactor: input.rhesusFactor as any, organDonor: input.organDonor ?? false, emergencyNotes: input.emergencyNotes },
      });
      return { success: true };
    });
  }
}
