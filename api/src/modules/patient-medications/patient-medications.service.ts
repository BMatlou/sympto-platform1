import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationQueueService } from '../notification-queue/notification-queue.service';
import { CreatePatientMedicationDto } from './dto/create-patient-medication.dto';
import { UpdatePatientMedicationDto } from './dto/update-patient-medication.dto';
import { QueryPatientMedicationDto } from './dto/query-patient-medication.dto';
import { CreateMedicationReminderDto } from './dto/create-medication-reminder.dto';
import {
  MedicationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '@prisma/client';

@Injectable()
export class PatientMedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  async create(dto: CreatePatientMedicationDto) {
    const healthPassport = await this.prisma.healthPassport.findUnique({ where: { id: dto.healthPassportId } });
    if (!healthPassport) throw new NotFoundException('Health passport not found.');
    const medication = await this.prisma.medication.findUnique({ where: { id: dto.medicationId } });
    if (!medication) throw new NotFoundException('Medication not found.');
    const existing = await this.prisma.patientMedication.findFirst({ where: { healthPassportId: dto.healthPassportId, medicationId: dto.medicationId } });
    if (existing) throw new ConflictException('This medication has already been added to the health passport.');
    return this.prisma.patientMedication.create({
      data: {
        healthPassportId: dto.healthPassportId,
        medicationId: dto.medicationId,
        dosage: dto.dosage?.trim(),
        frequency: dto.frequency?.trim(),
        route: dto.route?.trim(),
        prescribedBy: dto.prescribedBy?.trim(),
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        status: dto.status ?? MedicationStatus.ACTIVE,
        notes: dto.notes?.trim(),
      },
      include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } },
    });
  }

  async findAll(query: QueryPatientMedicationDto) {
    const { page, limit, healthPassportId, medicationId, status } = query;
    const where: Prisma.PatientMedicationWhereInput = {
      ...(healthPassportId && { healthPassportId }),
      ...(medicationId && { medicationId }),
      ...(status !== undefined && { status }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.patientMedication.findMany({ where, include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } }, orderBy: { startedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.patientMedication.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const patientMedication = await this.prisma.patientMedication.findUnique({
      where: { id },
      include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } },
    });
    if (!patientMedication) throw new NotFoundException('Patient medication not found.');
    return patientMedication;
  }

  async update(id: string, dto: UpdatePatientMedicationDto) {
    const existing = await this.findOne(id);
    const healthPassportId = dto.healthPassportId ?? existing.healthPassportId;
    const medicationId = dto.medicationId ?? existing.medicationId;
    if (dto.healthPassportId) {
      const passport = await this.prisma.healthPassport.findUnique({ where: { id: dto.healthPassportId } });
      if (!passport) throw new NotFoundException('Health passport not found.');
    }
    if (dto.medicationId) {
      const medication = await this.prisma.medication.findUnique({ where: { id: dto.medicationId } });
      if (!medication) throw new NotFoundException('Medication not found.');
    }
    const duplicate = await this.prisma.patientMedication.findFirst({ where: { id: { not: id }, healthPassportId, medicationId } });
    if (duplicate) throw new ConflictException('This medication has already been added to the health passport.');
    return this.prisma.patientMedication.update({
      where: { id },
      data: {
        healthPassportId,
        medicationId,
        dosage: dto.dosage?.trim(),
        frequency: dto.frequency?.trim(),
        route: dto.route?.trim(),
        prescribedBy: dto.prescribedBy?.trim(),
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        status: dto.status,
        notes: dto.notes?.trim(),
      },
      include: { medication: true, healthPassport: { include: { patient: { include: { person: true } } } } },
    });
  }

  async scheduleReminder(id: string, dto: CreateMedicationReminderDto, authenticatedUserId: string) {
    const medication = await this.findOne(id);
    const ownerUserId = medication.healthPassport.patient.userId;
    if (!authenticatedUserId || ownerUserId !== authenticatedUserId) {
      throw new NotFoundException('Patient medication not found.');
    }

    const medicationName = medication.medication.name || medication.medication.genericName || 'Medication';
    const scheduledFor = new Date(dto.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) throw new ConflictException('The reminder time is invalid.');
    if (scheduledFor.getTime() <= Date.now()) throw new ConflictException('The reminder must be scheduled in the future.');

    const notification = await this.notificationsService.create({
      userId: ownerUserId,
      type: NotificationType.REMINDER,
      title: `Medication reminder: ${medicationName}`,
      body: `It is time to take ${medicationName}${medication.dosage ? ` (${medication.dosage})` : ''}. Follow the instructions provided by your healthcare professional.`,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
      priority: NotificationPriority.NORMAL,
      actionUrl: '/medications',
      actionLabel: 'View medication',
      scheduledFor: scheduledFor.toISOString(),
    });

    await this.notificationQueueService.create({ notificationId: notification.id, scheduledFor: scheduledFor.toISOString() });
    return { reminder: notification, scheduledFor: scheduledFor.toISOString() };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.patientMedication.delete({ where: { id } });
    return { message: 'Patient medication deleted successfully.' };
  }
}
