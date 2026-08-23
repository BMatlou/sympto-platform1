import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAdherenceGoalDto } from './dto/create-adherence-goal.dto';

@Injectable()
export class MedicationAdherenceGoalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAdherenceGoalDto) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient not found.');
    const rows = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "MedicationAdherenceGoal" ("id","patientId","title","targetPercent","startDate","endDate","windowDays","createdAt","updatedAt")
      VALUES (gen_random_uuid(),${patient.id},${dto.title},${dto.targetPercent},${new Date(dto.startDate)},${new Date(dto.endDate)},${dto.windowDays ?? 30},NOW(),NOW())
      RETURNING *
    `;
    return this.withProgress(rows[0]);
  }

  async list(userId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient not found.');
    const goals = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "MedicationAdherenceGoal" WHERE "patientId"=${patient.id} ORDER BY "createdAt" DESC
    `;
    return Promise.all(goals.map((goal) => this.withProgress(goal)));
  }

  private async withProgress(goal: any) {
    const logs = await this.prisma.$queryRaw<any[]>`
      SELECT "action" FROM "MedicationAdherenceLog"
      WHERE "patientId"=${goal.patientId} AND "recordedAt">=${goal.startDate} AND "recordedAt"<=${goal.endDate}
    `;
    const taken = logs.filter((l) => l.action === 'TAKEN').length;
    const total = logs.length;
    const adherencePercent = total ? Math.round((taken / total) * 1000) / 10 : 0;
    return { ...goal, progressPercent: Math.min(100, Math.round((adherencePercent / Number(goal.targetPercent)) * 100)), adherencePercent, taken, total, achieved: adherencePercent >= Number(goal.targetPercent) };
  }
}
