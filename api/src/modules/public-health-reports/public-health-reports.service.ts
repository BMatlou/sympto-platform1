import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PublicHealthReportStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePublicHealthReportDto } from './dto/create-public-health-report.dto';
import { UpdatePublicHealthReportDto } from './dto/update-public-health-report.dto';
import { QueryPublicHealthReportDto } from './dto/query-public-health-report.dto';

@Injectable()
export class PublicHealthReportsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreatePublicHealthReportDto) {
    const existing =
      await this.prisma.publicHealthReport.findUnique({
        where: {
          reportNumber: dto.reportNumber,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Report number already exists.',
      );
    }

    if (dto.patientId) {
      const patient =
        await this.prisma.patient.findUnique({
          where: { id: dto.patientId },
        });

      if (!patient) {
        throw new NotFoundException(
          'Patient not found.',
        );
      }
    }

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: { id: dto.encounterId },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    if (dto.practitionerId) {
      const practitioner =
        await this.prisma.practitioner.findUnique({
          where: { id: dto.practitionerId },
        });

      if (!practitioner) {
        throw new NotFoundException(
          'Practitioner not found.',
        );
      }
    }

    if (dto.organizationId) {
      const organization =
        await this.prisma.organization.findUnique({
          where: { id: dto.organizationId },
        });

      if (!organization) {
        throw new NotFoundException(
          'Organization not found.',
        );
      }
    }

    if (dto.departmentId) {
      const department =
        await this.prisma.department.findUnique({
          where: { id: dto.departmentId },
        });

      if (!department) {
        throw new NotFoundException(
          'Department not found.',
        );
      }
    }

    return this.prisma.publicHealthReport.create({
      data: {
        reportNumber: dto.reportNumber,
        reportType: dto.reportType,
        status:
          dto.status ??
          PublicHealthReportStatus.DRAFT,
        priority: dto.priority,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        practitionerId: dto.practitionerId,
        organizationId: dto.organizationId,
        departmentId: dto.departmentId,
        title: dto.title,
        description: dto.description,
        diseaseCode: dto.diseaseCode,
        diseaseName: dto.diseaseName,
        reportData: dto.reportData,
        submittedAt: dto.submittedAt,
        acknowledgedAt: dto.acknowledgedAt,
      },
      include: {
        patient: true,
        encounter: true,
        practitioner: true,
        organization: true,
        department: true,
        attachments: true,
        submissions: true,
      },
    });
  }

  async findAll(
    query: QueryPublicHealthReportDto,
  ) {
    const {
      page,
      limit,
      status,
      priority,
      reportType,
      patientId,
    } = query;

    const where: Prisma.PublicHealthReportWhereInput = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(reportType && { reportType }),
      ...(patientId && { patientId }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.publicHealthReport.findMany({
          where,
          include: {
            patient: true,
            encounter: true,
            practitioner: true,
            organization: true,
            department: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.publicHealthReport.count({
          where,
        }),
      ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit,
        ),
      },
    };
  }

  async findOne(id: string) {
    const report =
      await this.prisma.publicHealthReport.findUnique({
        where: { id },
        include: {
          patient: true,
          encounter: true,
          practitioner: true,
          organization: true,
          department: true,
          attachments: true,
          submissions: true,
        },
      });

    if (!report) {
      throw new NotFoundException(
        'Public health report not found.',
      );
    }

    return report;
  }

  async update(
    id: string,
    dto: UpdatePublicHealthReportDto,
  ) {
    await this.findOne(id);

    return this.prisma.publicHealthReport.update({
      where: { id },
      data: {
        reportNumber: dto.reportNumber,
        reportType: dto.reportType,
        status: dto.status,
        priority: dto.priority,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        practitionerId: dto.practitionerId,
        organizationId: dto.organizationId,
        departmentId: dto.departmentId,
        title: dto.title,
        description: dto.description,
        diseaseCode: dto.diseaseCode,
        diseaseName: dto.diseaseName,
        reportData: dto.reportData,
        submittedAt: dto.submittedAt,
        acknowledgedAt: dto.acknowledgedAt,
      },
      include: {
        patient: true,
        encounter: true,
        practitioner: true,
        organization: true,
        department: true,
        attachments: true,
        submissions: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.publicHealthReport.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Public health report deleted successfully.',
    };
  }
}