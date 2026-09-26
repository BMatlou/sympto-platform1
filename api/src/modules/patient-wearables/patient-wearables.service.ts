import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeviceStatus,
  DeviceType,
  MeasurementType,
  SleepStageType,
  WearableConnectionStatus,
  WearableProvider,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DeviceMeasurementsService } from '../device-measurements/device-measurements.service';
import { GoalsEngineService } from '../health-goals/goals-engine-v3.service';
import {
  SyncWearableDataDto,
  WearableMeasurementRecordDto,
  WearableSleepSessionDto,
  WearableWellnessMetricDto,
  WearableWorkoutSessionDto,
} from './dto/sync-wearable-data.dto';

@Injectable()
export class PatientWearablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deviceMeasurements: DeviceMeasurementsService,
    private readonly goalsEngine: GoalsEngineService,
  ) {}

  private async patientForUser(userId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new ForbiddenException('Patient account required.');
    return patient;
  }

  getSupportedProviders() {
    return [
      {
        provider: WearableProvider.BLUETOOTH_LE,
        name: 'Bluetooth LE',
        connectionMode: 'WEB_BLUETOOTH',
        status: 'AVAILABLE_NOW',
        note: 'Direct browser connection for compatible BLE health devices.',
      },
      {
        provider: WearableProvider.APPLE_HEALTHKIT,
        name: 'Apple Health',
        connectionMode: 'NATIVE_IOS',
        status: 'NATIVE_ADAPTER_REQUIRED',
        note: 'Apple HealthKit bridge for iPhone and Apple Watch data.',
      },
      {
        provider: WearableProvider.HEALTH_CONNECT,
        name: 'Health Connect',
        connectionMode: 'NATIVE_ANDROID',
        status: 'NATIVE_ADAPTER_REQUIRED',
        note: 'Android health-data bridge for compatible health and fitness sources.',
      },
      {
        provider: WearableProvider.SAMSUNG_HEALTH,
        name: 'Samsung Health',
        connectionMode: 'NATIVE_ANDROID',
        status: 'NATIVE_ADAPTER_REQUIRED',
        note: 'Samsung Health Data SDK bridge for Galaxy wearable data.',
      },
      {
        provider: WearableProvider.GARMIN,
        name: 'Garmin',
        connectionMode: 'CLOUD_API',
        status: 'PROVIDER_ADAPTER_REQUIRED',
        note: 'Garmin Health API connection.',
      },
      {
        provider: WearableProvider.FITBIT,
        name: 'Fitbit',
        connectionMode: 'CLOUD_API',
        status: 'PROVIDER_ADAPTER_REQUIRED',
        note: 'Fitbit data API connection.',
      },
      {
        provider: WearableProvider.OURA,
        name: 'Oura',
        connectionMode: 'CLOUD_API',
        status: 'PROVIDER_ADAPTER_REQUIRED',
        note: 'Oura API connection.',
      },
      {
        provider: WearableProvider.POLAR,
        name: 'Polar',
        connectionMode: 'CLOUD_API',
        status: 'PROVIDER_ADAPTER_REQUIRED',
        note: 'Polar AccessLink connection.',
      },
      {
        provider: WearableProvider.SYMPTO_WEARABLE,
        name: 'Sympto wearable',
        connectionMode: 'SYMPTO_BLE',
        status: 'PROTOCOL_READY',
        note: 'Reserved for the future Sympto device protocol.',
      },
    ];
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
        connection: {
          select: {
            id: true,
            provider: true,
            status: true,
            connectedAt: true,
            lastSyncAt: true,
            lastSuccessfulSyncAt: true,
          },
        },
        measurements: {
          orderBy: { measuredAt: 'desc' },
          take: 1,
          select: {
            measurementType: true,
            metricKey: true,
            value: true,
            unit: true,
            secondaryValue: true,
            secondaryUnit: true,
            measuredAt: true,
            source: true,
          },
        },
      },
    });
  }

  async connect(
    userId: string,
    input: {
      manufacturer: string;
      model: string;
      deviceType?: DeviceType;
      provider?: WearableProvider;
    },
  ) {
    const patient = await this.patientForUser(userId);
    const manufacturer = input.manufacturer.trim() || 'Bluetooth LE';
    const model = input.model.trim() || 'Smart Watch';
    const deviceType = input.deviceType ?? DeviceType.SMARTWATCH;
    const provider = input.provider ?? WearableProvider.BLUETOOTH_LE;

    const connection = await this.prisma.wearableConnection.upsert({
      where: {
        patientId_provider: {
          patientId: patient.id,
          provider,
        },
      },
      update: {
        status: WearableConnectionStatus.CONNECTED,
        connectedAt: new Date(),
        lastError: null,
      },
      create: {
        patientId: patient.id,
        provider,
        status: WearableConnectionStatus.CONNECTED,
        connectedAt: new Date(),
      },
      select: {
        id: true,
        provider: true,
        status: true,
        connectedAt: true,
      },
    });

    const existing = await this.prisma.wearableDevice.findFirst({
      where: {
        patientId: patient.id,
        connectionId: connection.id,
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
          connectionId: connection.id,
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
          connection: {
            select: {
              id: true,
              provider: true,
              status: true,
              connectedAt: true,
            },
          },
        },
      });
    }

    return this.prisma.wearableDevice.create({
      data: {
        patientId: patient.id,
        connectionId: connection.id,
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
        connection: {
          select: {
            id: true,
            provider: true,
            status: true,
            connectedAt: true,
          },
        },
      },
    });
  }

  async disconnect(userId: string, deviceId: string) {
    const patient = await this.patientForUser(userId);
    const device = await this.prisma.wearableDevice.findFirst({ where: { id: deviceId, patientId: patient.id } });
    if (!device) throw new NotFoundException('Wearable device not found.');
    const updated = await this.prisma.wearableDevice.update({
      where: { id: deviceId },
      data: { status: DeviceStatus.DISCONNECTED },
      select: { id: true, status: true, lastSyncAt: true },
    });

    if (device.connectionId) {
      const siblingDevices = await this.prisma.wearableDevice.count({
        where: {
          connectionId: device.connectionId,
          status: DeviceStatus.ACTIVE,
          id: { not: deviceId },
        },
      });

      if (siblingDevices === 0) {
        await this.prisma.wearableConnection.update({
          where: { id: device.connectionId },
          data: { status: WearableConnectionStatus.DISCONNECTED },
        });
      }
    }

    return updated;
  }

  async recordHeartRate(userId: string, deviceId: string, value: number, measuredAt: string, source = 'bluetooth-heart-rate') {
    const patient = await this.patientForUser(userId);
    if (!Number.isFinite(value) || value < 20 || value > 260) {
      throw new BadRequestException('Heart-rate value is outside the supported range.');
    }
    const device = await this.prisma.wearableDevice.findFirst({ where: { id: deviceId, patientId: patient.id } });
    if (!device) throw new NotFoundException('Wearable device not found.');

    const measurement = await this.deviceMeasurements.create({
      deviceId,
      connectionId: device.connectionId ?? undefined,
      measurementType: MeasurementType.HEART_RATE,
      value,
      unit: 'bpm',
      measuredAt,
      source: source.startsWith('wearable') ? source : 'wearable:' + source,
    });

    await this.prisma.wearableDevice.update({
      where: { id: deviceId },
      data: { lastSyncAt: new Date() },
    });

    return measurement;
  }

  async sync(
    userId: string,
    deviceId: string,
    dto: SyncWearableDataDto,
  ) {
    const patient = await this.patientForUser(userId);
    const device = await this.prisma.wearableDevice.findFirst({
      where: { id: deviceId, patientId: patient.id },
      include: { connection: true },
    });

    if (!device) throw new NotFoundException('Wearable device not found.');

    const provider = device.connection?.provider ?? WearableProvider.BLUETOOTH_LE;
    const sourcePrefix = 'wearable:' + String(provider).toLowerCase();
    const syncStartedAt = new Date();

    const syncLog = await this.prisma.deviceSyncLog.create({
      data: {
        deviceId,
        connectionId: device.connectionId,
        syncStartedAt,
      },
    });

    let imported = 0;
    const errors: string[] = [];

    for (const record of dto.measurements ?? []) {
      try {
        const created = await this.syncMeasurement(
          device.id,
          device.connectionId,
          sourcePrefix,
          record,
        );
        if (created) imported += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Wearable measurement import failed.');
      }
    }

    for (const record of dto.sleepSessions ?? []) {
      try {
        const created = await this.syncSleep(
          patient.id,
          device.id,
          device.connectionId,
          sourcePrefix,
          record,
        );
        if (created) imported += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Wearable sleep import failed.');
      }
    }

    for (const record of dto.workouts ?? []) {
      try {
        const created = await this.syncWorkout(
          patient.id,
          device.id,
          device.connectionId,
          sourcePrefix,
          record,
        );
        if (created) imported += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Wearable workout import failed.');
      }
    }

    for (const record of dto.wellnessMetrics ?? []) {
      try {
        const created = await this.syncWellness(
          patient.id,
          device.id,
          device.connectionId,
          sourcePrefix,
          record,
        );
        if (created) imported += 1;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Wearable wellness import failed.');
      }
    }

    const completedAt = new Date();
    const success = errors.length === 0;

    await this.prisma.deviceSyncLog.update({
      where: { id: syncLog.id },
      data: {
        syncCompletedAt: completedAt,
        success,
        recordsImported: imported,
        errorMessage: errors.length ? errors.join(' | ').slice(0, 4000) : null,
      },
    });

    await this.prisma.wearableDevice.update({
      where: { id: device.id },
      data: { lastSyncAt: completedAt },
    });

    if (device.connectionId) {
      await this.prisma.wearableConnection.update({
        where: { id: device.connectionId },
        data: {
          status: success ? WearableConnectionStatus.CONNECTED : WearableConnectionStatus.ERROR,
          lastSyncAt: completedAt,
          lastSuccessfulSyncAt: success ? completedAt : undefined,
          lastError: errors.length ? errors.join(' | ').slice(0, 4000) : null,
        },
      });
    }

    return {
      success,
      deviceId: device.id,
      provider,
      recordsImported: imported,
      errors,
      syncedAt: completedAt.toISOString(),
    };
  }

  private async syncMeasurement(
    deviceId: string,
    connectionId: string | null,
    sourcePrefix: string,
    record: WearableMeasurementRecordDto,
  ) {
    const source = record.source?.trim() || sourcePrefix;
    return this.deviceMeasurements.create({
      deviceId,
      connectionId: connectionId ?? undefined,
      measurementType: record.measurementType,
      metricKey: record.metricKey,
      value: record.value,
      unit: record.unit,
      secondaryValue: record.secondaryValue,
      secondaryUnit: record.secondaryUnit,
      measuredAt: record.measuredAt,
      source,
      externalRecordId: record.externalRecordId,
      notes: record.notes,
    });
  }

  private async syncSleep(
    patientId: string,
    deviceId: string,
    connectionId: string | null,
    sourcePrefix: string,
    record: WearableSleepSessionDto,
  ) {
    const startedAt = new Date(record.startedAt);
    const endedAt = new Date(record.endedAt);

    if (
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime()) ||
      endedAt <= startedAt
    ) {
      throw new BadRequestException('Wearable sleep interval is invalid.');
    }

    if (record.externalRecordId) {
      const existing = await this.prisma.sleepSession.findFirst({
        where: {
          patientId,
          deviceId,
          externalRecordId: record.externalRecordId,
        },
        select: { id: true },
      });

      if (existing) return null;
    }

    const durationMinutes =
      record.durationMinutes ??
      Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

    const session = await this.prisma.sleepSession.create({
      data: {
        patientId,
        deviceId,
        connectionId: connectionId ?? undefined,
        externalRecordId: record.externalRecordId,
        startedAt,
        endedAt,
        durationMinutes,
        sleepScore: record.sleepScore,
        source: record.source?.trim() || sourcePrefix,
        timezone: record.timezone,
        stages: {
          create: (record.stages ?? []).map((stage) => {
            const stageStarted = new Date(stage.startedAt);
            const stageEnded = new Date(stage.endedAt);

            if (
              Number.isNaN(stageStarted.getTime()) ||
              Number.isNaN(stageEnded.getTime()) ||
              stageEnded <= stageStarted
            ) {
              throw new BadRequestException('Wearable sleep stage interval is invalid.');
            }

            return {
              stage: stage.stage,
              startedAt: stageStarted,
              endedAt: stageEnded,
              durationMinutes:
                stage.durationMinutes ??
                Math.max(
                  0,
                  Math.round((stageEnded.getTime() - stageStarted.getTime()) / 60000),
                ),
            };
          }),
        },
      },
    });

    await this.goalsEngine.recordMetricEvent({
      patientId,
      metricType: 'SLEEP',
      metricKey: 'sleep.hours',
      loggedValue: Number((durationMinutes / 60).toFixed(2)),
      occurredAt: endedAt,
      source: 'wearable',
      sourceId: session.id,
    });

    return session;
  }

  private async syncWorkout(
    patientId: string,
    deviceId: string,
    connectionId: string | null,
    sourcePrefix: string,
    record: WearableWorkoutSessionDto,
  ) {
    const startedAt = new Date(record.startedAt);
    const endedAt = new Date(record.endedAt);

    if (
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime()) ||
      endedAt <= startedAt
    ) {
      throw new BadRequestException('Wearable workout interval is invalid.');
    }

    if (record.externalRecordId) {
      const existing = await this.prisma.workoutSession.findFirst({
        where: {
          patientId,
          deviceId,
          externalRecordId: record.externalRecordId,
        },
        select: { id: true },
      });

      if (existing) return null;
    }

    const durationSeconds =
      record.durationSeconds ??
      Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

    const workout = await this.prisma.workoutSession.create({
      data: {
        patientId,
        deviceId,
        connectionId: connectionId ?? undefined,
        externalRecordId: record.externalRecordId,
        activityType: record.activityType.trim(),
        startedAt,
        endedAt,
        durationSeconds,
        distance: record.distance,
        distanceUnit: record.distanceUnit,
        calories: record.calories,
        averageHeartRate: record.averageHeartRate,
        maximumHeartRate: record.maximumHeartRate,
        source: record.source?.trim() || sourcePrefix,
        metadata: record.metadata,
      },
    });

    await this.goalsEngine.recordMetricEvent({
      patientId,
      metricType: 'EXERCISE',
      metricKey: 'exercise.minutes',
      loggedValue: Number((durationSeconds / 60).toFixed(2)),
      occurredAt: endedAt,
      source: 'wearable',
      sourceId: workout.id,
    });

    return workout;
  }

  private async syncWellness(
    patientId: string,
    deviceId: string,
    connectionId: string | null,
    sourcePrefix: string,
    record: WearableWellnessMetricDto,
  ) {
    if (record.externalRecordId) {
      const existing = await this.prisma.wearableWellnessMetric.findFirst({
        where: {
          patientId,
          deviceId,
          externalRecordId: record.externalRecordId,
          metricKey: record.metricKey,
        },
        select: { id: true },
      });

      if (existing) return null;
    }

    return this.prisma.wearableWellnessMetric.create({
      data: {
        patientId,
        deviceId,
        connectionId: connectionId ?? undefined,
        externalRecordId: record.externalRecordId,
        metricKey: record.metricKey.trim(),
        value: record.value,
        unit: record.unit,
        measuredAt: record.measuredAt,
        source: record.source?.trim() || sourcePrefix,
        metadata: record.metadata,
      },
    });
  }
}