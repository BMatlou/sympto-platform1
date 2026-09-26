import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeviceStatus, DeviceType, MeasurementType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PatientWearablesService {
  constructor(private readonly prisma: PrismaService) {}

  private async patientForUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new ForbiddenException('Patient account required.');
    return patient;
  }

  async list(userId: string) {
    const patient = await this.patientForUser(userId);
    return this.prisma.wearableDevice.findMany({
      where: { patientId: patient.id },
      orderBy: { registeredAt: 'desc' },
      select: {
        id: true,
        manufacturer: true,
        model: true,
        deviceType: true,
        status: true,
        lastSyncAt: true,
        registeredAt: true,
        measurements: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
          select: {
            measurementType: true,
            value: true,
            unit: true,
            measuredAt: true,
            source: true,
          },
        },
      },
    });
  }

  async connect(userId: string, input: { manufacturer: string; model: string; deviceType?: DeviceType }) {
    const patient = await this.patientForUser(userId);
    const manufacturer = input.manufacturer.trim() || 'Bluetooth LE';
    const model = input.model.trim() || 'Smart Watch';
    const deviceType = input.deviceType ?? DeviceType.SMARTWATCH;

    const existing = await this.prisma.wearableDevice.findFirst({
      where: {
        patientId: patient.id,
        manufacturer,
        model,
        status: { not: DeviceStatus.RETIRED },
      },
      orderBy: { registeredAt: 'desc' },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.wearableDevice.update({
        where: { id: existing.id },
        data: {
          deviceType,
          status: DeviceStatus.ACTIVE,
        },
        select: {
          id: true,
          manufacturer: true,
          model: true,
          deviceType: true,
          status: true,
          lastSyncAt: true,
          registeredAt: true,
        },
      });
    }

    return this.prisma.wearableDevice.create({
      data: {
        patientId: patient.id,
        manufacturer,
        model,
        deviceType,
        status: DeviceStatus.ACTIVE,
      },
      select: {
        id: true,
        manufacturer: true,
        model: true,
        deviceType: true,
        status: true,
        lastSyncAt: true,
        registeredAt: true,
      },
    });
  }

  async disconnect(userId: string, deviceId: string) {
    const patient = await this.patientForUser(userId);
    const device = await this.prisma.wearableDevice.findFirst({ where: { id: deviceId, patientId: patient.id } });
    if (!device) throw new NotFoundException('Wearable device not found.');
    return this.prisma.wearableDevice.update({
      where: { id: deviceId },
      data: { status: DeviceStatus.DISCONNECTED },
      select: { id: true, status: true, lastSyncAt: true },
    });
  }

  async recordHeartRate(userId: string, deviceId: string, value: number, measuredAt: string, source = 'bluetooth-heart-rate') {
    const patient = await this.patientForUser(userId);
    if (!Number.isFinite(value) || value < 20 || value > 260) {
      throw new BadRequestException('Heart-rate value is outside the supported range.');
    }
    const device = await this.prisma.wearableDevice.findFirst({ where: { id: deviceId, patientId: patient.id } });
    if (!device) throw new NotFoundException('Wearable device not found.');

    const measurement = await this.prisma.deviceMeasurement.create({
      data: {
        deviceId,
        measurementType: MeasurementType.HEART_RATE,
        value,
        unit: 'bpm',
        measuredAt: new Date(measuredAt),
        source,
      },
    });

    await this.prisma.wearableDevice.update({
      where: { id: deviceId },
      data: { lastSyncAt: new Date() },
    });

    return measurement;
  }
}
