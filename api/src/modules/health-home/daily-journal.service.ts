import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { HealthHomeService } from './health-home.service';

@Injectable()
export class DailyJournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthHomeService: HealthHomeService,
  ) {}

  async generate(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient health profile not found.');
    }

    const healthHome = await this.healthHomeService.getHealthHome(userId);
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existing = await this.prisma.healthJournal.findFirst({
      where: {
        patientId: patient.id,
        title: { startsWith: '[Sympto] Daily health summary' },
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });

    const signals = healthHome.journal.signals;
    const signal = (type: string) => signals.find((item) => item.type === type);
    const sleep = signal('SLEEP');
    const steps = signal('STEPS');
    const heartRate = signal('HEART_RATE');
    const oxygen = signal('OXYGEN_SATURATION');
    const temperature = signal('BODY_TEMPERATURE');
    const respiratory = signal('RESPIRATORY_RATE');
    const weight = signal('WEIGHT');

    const lines = [
      `Sympto automatically compiled ${healthHome.journal.sourceCount} health signals for today.`,
      '',
      sleep ? `Sleep: ${sleep.value} ${sleep.unit}.` : null,
      steps ? `Activity: ${steps.value} ${steps.unit}.` : null,
      heartRate ? `Latest heart rate: ${heartRate.value} ${heartRate.unit}.` : null,
      oxygen ? `Latest oxygen saturation: ${oxygen.value} ${oxygen.unit}.` : null,
      temperature ? `Latest body temperature: ${temperature.value} ${temperature.unit}.` : null,
      respiratory ? `Latest respiratory rate: ${respiratory.value} ${respiratory.unit}.` : null,
      weight ? `Latest weight: ${weight.value} ${weight.unit}.` : null,
      healthHome.journal.medicationCount
        ? `Current medications on file: ${healthHome.journal.medicationCount}.`
        : 'No current medications are recorded.',
      healthHome.journal.upcomingAppointmentCount
        ? `Upcoming appointments: ${healthHome.journal.upcomingAppointmentCount}.`
        : 'No upcoming appointments are currently scheduled.',
      healthHome.journal.recentSymptoms.length
        ? `Recent symptoms: ${healthHome.journal.recentSymptoms
            .map((item: any) => item.title || item.symptoms?.join(', '))
            .filter(Boolean)
            .join('; ')}.`
        : 'No recent symptoms were recorded.',
      healthHome.goals.length
        ? `Active health goals: ${healthHome.goals
            .map((goal: any) => goal.title)
            .filter(Boolean)
            .join('; ')}.`
        : 'No active health goals are currently recorded.',
    ].filter(Boolean) as string[];

    const journal = lines.join('\n');

    const data = {
      title: '[Sympto] Daily health summary',
      journal,
      sleepHours: sleep?.value,
      exerciseMinutes: undefined,
      weightKg: weight?.value,
      temperature: temperature?.value,
      heartRate: heartRate ? Math.round(heartRate.value) : undefined,
      oxygenSaturation: oxygen?.value,
      respiratoryRate: respiratory ? Math.round(respiratory.value) : undefined,
    };

    if (existing) {
      return this.prisma.healthJournal.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.healthJournal.create({
      data: {
        ...data,
        patientId: patient.id,
      },
    });
  }
}
