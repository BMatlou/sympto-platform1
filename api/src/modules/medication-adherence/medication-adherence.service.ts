import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MedicationAdherenceAction, RecordMedicationAdherenceDto } from './dto/record-medication-adherence.dto';

@Injectable()
export class MedicationAdherenceService {
  constructor(private readonly prisma: PrismaService) {}

  async record(userId: string, dto: RecordMedicationAdherenceDto) {
    const medication = await this.prisma.patientMedication.findUnique({
      where: { id: dto.medicationId },
      include: { healthPassport: { include: { patient: true } } },
    });
    if (!medication || medication.healthPassport.patient.userId !== userId) {
      throw new NotFoundException('Patient medication not found.');
    }

    const rows = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "MedicationAdherenceLog"
        ("id", "patientId", "medicationId", "notificationId", "action", "scheduledFor", "recordedAt")
      VALUES
        (gen_random_uuid(), ${medication.healthPassport.patient.id}, ${dto.medicationId}, ${dto.notificationId ?? null}, ${dto.action}, ${dto.scheduledFor ? new Date(dto.scheduledFor) : null}, NOW())
      RETURNING *
    `;
    return rows[0];
  }

  async summary(userId: string, days = 30) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient not found.');
    const since = new Date(Date.now() - days * 86400000);
    const logs = await this.prisma.$queryRaw<any[]>`
      SELECT "action", "recordedAt" FROM "MedicationAdherenceLog"
      WHERE "patientId" = ${patient.id} AND "recordedAt" >= ${since}
      ORDER BY "recordedAt" ASC
    `;
    const taken = logs.filter((l) => l.action === MedicationAdherenceAction.TAKEN).length;
    const skipped = logs.filter((l) => l.action === MedicationAdherenceAction.SKIPPED).length;
    const total = taken + skipped;
    const adherencePercent = total ? Math.round((taken / total) * 1000) / 10 : 0;
    const daysTaken = new Set(logs.filter((l) => l.action === MedicationAdherenceAction.TAKEN).map((l) => new Date(l.recordedAt).toISOString().slice(0, 10)));
    let currentStreak = 0;
    const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    while (daysTaken.has(cursor.toISOString().slice(0, 10))) { currentStreak += 1; cursor.setDate(cursor.getDate() - 1); }
    return { days, taken, skipped, total, adherencePercent, currentStreak, needsReminderAdjustment: total > 0 && adherencePercent < 80 };
  }
}
