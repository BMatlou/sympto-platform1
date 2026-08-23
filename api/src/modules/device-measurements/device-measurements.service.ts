import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  HealthGoalCategory,
  HealthGoalProgressStatus,
  HealthGoalStatus,
  MeasurementType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateDeviceMeasurementDto } from './dto/create-device-measurement.dto';
import { UpdateDeviceMeasurementDto } from './dto/update-device-measurement.dto';
import { QueryDeviceMeasurementDto } from './dto/query-device-measurement.dto';

@Injectable()
export class DeviceMeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDeviceMeasurementDto,
  ) {
    const device =
      await this.prisma.wearableDevice.findUnique({
        where: {
          id: dto.deviceId,
        },
      });

    if (!device) {
      throw new NotFoundException(
        'Wearable device not found.',
      );
    }

    const measurement =
      await this.prisma.deviceMeasurement.create({
        data: {
          ...dto,
        },

        include: {
          device: true,
          deviceAlerts: true,
        },
      });

    await this.syncMeasurementToHealthGoals(
      device.patientId,
      measurement.measurementType,
      measurement.value,
      measurement.measuredAt,
    );

    return measurement;
  }

  private async syncMeasurementToHealthGoals(
    patientId: string,
    measurementType: MeasurementType,
    value: Prisma.Decimal,
    measuredAt: Date,
  ) {
    const category = this.goalCategoryForMeasurement(
      measurementType,
    );

    if (!category) {
      return;
    }

    const goals = await this.prisma.healthGoal.findMany({
      where: {
        patientId,
        category,
        status: {
          in: [
            HealthGoalStatus.ACTIVE,
            HealthGoalStatus.ON_HOLD,
          ],
        },
        targetValue: {
          not: null,
        },
      },
    });

    for (const goal of goals) {
      if (!goal.targetValue) {
        continue;
      }

      const target = Number(goal.targetValue);
      const current = Number(value);

      if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(current)) {
        continue;
      }

      const progressPercent = Math.min(
        100,
        Math.max(0, (current / target) * 100),
      );

      const progressStatus =
        progressPercent >= 100
          ? HealthGoalProgressStatus.ACHIEVED
          : progressPercent >= 75
            ? HealthGoalProgressStatus.ON_TRACK
            : progressPercent > 0
              ? HealthGoalProgressStatus.IMPROVING
              : HealthGoalProgressStatus.STAGNANT;

      await this.prisma.$transaction([
        this.prisma.healthGoalProgress.create({
          data: {
            healthGoalId: goal.id,
            currentValue: value,
            progressPercent,
            status: progressStatus,
            notes: `Automatically updated from ${measurementType.toLowerCase().replace(/_/g, ' ')} wearable data.`,
            measuredAt,
          },
        }),

        this.prisma.healthGoal.update({
          where: {
            id: goal.id,
          },
          data: {
            currentValue: value,
            ...(progressPercent >= 100
              ? {
                  status: HealthGoalStatus.ACHIEVED,
                  achievedAt: measuredAt,
                }
              : {}),
          },
        }),
      ]);
    }
  }

  private goalCategoryForMeasurement(
    measurementType: MeasurementType,
  ): HealthGoalCategory | null {
    switch (measurementType) {
      case MeasurementType.STEPS:
      case MeasurementType.DISTANCE:
      case MeasurementType.CALORIES:
        return HealthGoalCategory.EXERCISE;
      case MeasurementType.WEIGHT:
      case MeasurementType.BMI:
        return HealthGoalCategory.WEIGHT;
      case MeasurementType.BLOOD_PRESSURE:
        return HealthGoalCategory.BLOOD_PRESSURE;
      case MeasurementType.BLOOD_GLUCOSE:
        return HealthGoalCategory.BLOOD_GLUCOSE;
      case MeasurementType.SLEEP:
        return HealthGoalCategory.SLEEP;
      case MeasurementType.HEART_RATE:
        return HealthGoalCategory.HEART_RATE;
      default:
        return null;
    }
  }

  async findAll(
    query: QueryDeviceMeasurementDto,
  ) {
    const {
      page,
      limit,
      deviceId,
      measurementType,
    } = query;

    const where: Prisma.DeviceMeasurementWhereInput = {
      ...(deviceId && {
        deviceId,
      }),

      ...(measurementType && {
        measurementType,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.deviceMeasurement.findMany({
          where,

          include: {
            device: true,
            deviceAlerts: true,
          },

          orderBy: {
            measuredAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.deviceMeasurement.count({
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

  async findOne(
    id: string,
  ) {
    const measurement =
      await this.prisma.deviceMeasurement.findUnique({
        where: {
          id,
        },

        include: {
          device: true,
          deviceAlerts: true,
        },
      });

    if (!measurement) {
      throw new NotFoundException(
        'Device measurement not found.',
      );
    }

    return measurement;
  }

  async update(
    id: string,
    dto: UpdateDeviceMeasurementDto,
  ) {
    const measurement =
      await this.prisma.deviceMeasurement.findUnique({
        where: {
          id,
        },
      });

    if (!measurement) {
      throw new NotFoundException(
        'Device measurement not found.',
      );
    }

    if (
      dto.deviceId &&
      dto.deviceId !== measurement.deviceId
    ) {
      const device =
        await this.prisma.wearableDevice.findUnique({
          where: {
            id: dto.deviceId,
          },
        });

      if (!device) {
        throw new NotFoundException(
          'Wearable device not found.',
        );
      }
    }

    return this.prisma.deviceMeasurement.update({
      where: {
        id,
      },

      data: {
        ...dto,
      },

      include: {
        device: true,
        deviceAlerts: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const measurement =
      await this.prisma.deviceMeasurement.findUnique({
        where: {
          id,
        },
      });

    if (!measurement) {
      throw new NotFoundException(
        'Device measurement not found.',
      );
    }

    await this.prisma.deviceMeasurement.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Device measurement deleted successfully.',
    };
  }
}