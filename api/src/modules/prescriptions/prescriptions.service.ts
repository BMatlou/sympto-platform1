import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';

const prescriptionInclude = {
  encounter: true,
  patient: { include: { person: true } },
  practitioner: { include: { person: true } },
  items: { include: { medication: true } },
};

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePrescriptionDto) {
    const [encounter, patient, practitioner] = await this.prisma.$transaction([
      this.prisma.encounter.findUnique({ where: { id: dto.encounterId } }),
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
      this.prisma.practitioner.findUnique({ where: { id: dto.practitionerId } }),
    ]);
    if (!encounter) throw new NotFoundException('Encounter not found.');
    if (!patient) throw new NotFoundException('Patient not found.');
    if (!practitioner) throw new NotFoundException('Practitioner not found.');

    return this.prisma.prescription.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        status: dto.status,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
      include: prescriptionInclude,
    });
  }

  async findAll(query: QueryPrescriptionDto) {
    const { page, limit, encounterId, patientId, practitionerId } = query;
    const where = {
      ...(encounterId && { encounterId }),
      ...(patientId && { patientId }),
      ...(practitionerId && { practitionerId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prescription.findMany({
        where,
        include: prescriptionInclude,
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id }, include: prescriptionInclude });
    if (!prescription) throw new NotFoundException('Prescription not found.');
    return prescription;
  }

  async update(id: string, dto: UpdatePrescriptionDto) {
    await this.findOne(id);
    return this.prisma.prescription.update({
      where: { id },
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        practitionerId: dto.practitionerId,
        status: dto.status,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
      include: prescriptionInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.prescription.delete({ where: { id } });
    return { message: 'Prescription deleted successfully.' };
  }
}
