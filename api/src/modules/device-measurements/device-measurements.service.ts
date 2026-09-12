import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MeasurementType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { GoalsEngineService } from '../health-goals/goals-engine-v3.service';

import { CreateDeviceMeasurementDto } from './dto/create-device-measurement.dto';
import { UpdateDeviceMeasurementDto } from './dto/update-device-measurement.dto';
import { QueryDeviceMeasurementDto } from './dto/query-device-measurement.dto';

@Injectable()
export class DeviceMeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  private async syncWeightMeasurement(
    patientId: string,
    measurementId: string,
    measurementType: MeasurementType,
    value: Prisma.Decimal,
    measuredAt: Date,
  ) {
    if (measurementType !== MeasurementType.WEIGHT) return;

    const weightKg = Number(value);
    if (!Number.isFinite(weightKg)) return;

    // Keep the patient's current weight and the goal metric stream aligned.
    await this.prisma.patient.update({
      where: { id: patientId },
      data: { weightKg: String(weightKg) },
    });

    await this.goalsEngine.recordMetricEvent({
      patientId,
      metricType: 'WEIGHT',
      metricKey: 'weight.kg',
      loggedValue: weightKg,
      occurredAt: measuredAt,
      source: 'wearable',
      sourceId: measurementId,
    });
  }

  async create(dto: CreateDeviceMeasurementDto) {
    const device = await this.prisma.wearableDevice.findUnique({
      where: { id: dto.deviceId },
    });

    if (!device) {
      throw new NotFoundException('Wearable device not found.');
    }

    const measurement = await this.prisma.deviceMeasurement.create({
      data: { ...dto },
      include: {
        device: true,
        deviceAlerts: true,
      },
    });

    await this.syncWeightMeasurement(
      device.patientId,
      measurement.id,
      measurement.measurementType,
      measurement.value,
      measurement.measuredAt,
    );

    return measurement;
  }

  async findAll(query: QueryDeviceMeasurementDto) {
    const { page, limit, deviceId, measurementType } = query;
    const where: Prisma.DeviceMeasurementWhereInput = {
      ...(deviceId && { deviceId }),
      ...(measurementType && { measurementType }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deviceMeasurement.findMany({
        where,
        include: {
          device: true,
          deviceAlerts: true,
        },
        orderBy: { measuredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deviceMeasurement.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const measurement = await this.prisma.deviceMeasurement.findUnique({
      where: { id },
      include: {
        device: true,
        deviceAlerts: true,
      },
    });

    if (!measurement) {
      throw new NotFoundException('Device measurement not found.');
    }

    return measurement;
  }

  async update(id: string, dto: UpdateDeviceMeasurementDto) {
    const existing = await this.findOne(id);

    if (dto.deviceId && dto.deviceId !== existing.deviceId) {
      const device = await this.prisma.wearableDevice.findUnique({
        where: { id: dto.deviceId },
      });

      if (!device) {
        throw new NotFoundException('Wearable device not found.');
      }
    }

    const updated = await this.prisma.deviceMeasurement.update({
      where: { id },
      data: { ...dto },
      include: {
        device: true,
        deviceAlerts: true,
      },
    });

    const oldDevice = await this.prisma.wearableDevice.findUnique({
      where: { id: existing.deviceId },
      select: { patientId: true },
    });

    if (oldDevice?.patientId) {
      await this.goalsEngine.removeSourceEvents(
        oldDevice.patientId,
        'wearable',
        existing.id,
      );
    }

    const newDevice = await this.prisma.wearableDevice.findUnique({
      where: { id: updated.deviceId },
      select: { patientId: true },
    });

    if (newDevice?.patientId) {
      await this.syncWeightMeasurement(
        newDevice.patientId,
        updated.id,
        updated.measurementType,
        updated.value,
        updated.measuredAt,
      );
    }

    return updated;
  }

  async remove(id: string) {
    const measurement = await this.findOne(id);
    const device = await this.prisma.wearableDevice.findUnique({
      where: { id: measurement.deviceId },
      select: { patientId: true },
    });

    if (device?.patientId) {
      await this.goalsEngine.removeSourceEvents(
        device.patientId,
        'wearable',
        measurement.id,
      );
    }

    await this.prisma.deviceMeasurement.delete({ where: { id } });

    return {
      message: 'Device measurement deleted successfully.',
    };
  }
}
