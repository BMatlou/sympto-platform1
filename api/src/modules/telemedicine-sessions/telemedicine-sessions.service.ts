import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreateTelemedicineSessionDto } from './dto/create-telemedicine-session.dto';
import { QueryTelemedicineSessionDto } from './dto/query-telemedicine-session.dto';
import { UpdateTelemedicineSessionDto } from './dto/update-telemedicine-session.dto';

@Injectable()
export class TelemedicineSessionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateTelemedicineSessionDto,
  ) {
    if (dto.appointmentId) {
      const appointment =
        await this.prisma.appointment.findUnique({
          where: {
            id: dto.appointmentId,
          },
        });

      if (!appointment) {
        throw new NotFoundException(
          'Appointment not found.',
        );
      }
    }

    if (dto.encounterId) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    const existing =
      await this.prisma.telemedicineSession.findUnique({
        where: {
          meetingId: dto.meetingId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Meeting ID already exists.',
      );
    }

    return this.prisma.telemedicineSession.create({
      data: {
        appointmentId:
          dto.appointmentId,
        encounterId:
          dto.encounterId,

        meetingId:
          dto.meetingId,

        provider:
          dto.provider,

        joinUrl:
          dto.joinUrl,

        hostUrl:
          dto.hostUrl,

        recordingUrl:
          dto.recordingUrl,

        status:
          dto.status,

        scheduledStart:
          dto.scheduledStart,

        scheduledEnd:
          dto.scheduledEnd,

        actualStart:
          dto.actualStart,

        actualEnd:
          dto.actualEnd,

        waitingRoomEnabled:
          dto.waitingRoomEnabled ??
          true,

        recordingEnabled:
          dto.recordingEnabled ??
          false,

        chatEnabled:
          dto.chatEnabled ??
          true,

        screenSharingEnabled:
          dto.screenSharingEnabled ??
          true,

        notes:
          dto.notes,
      },

      include: {
        appointment: true,
        encounter: true,
      },
    });
  }

  async findAll(
    query: QueryTelemedicineSessionDto,
  ) {
    const {
      page,
      limit,
      appointmentId,
      encounterId,
      provider,
      status,
    } = query;

    const where: Prisma.TelemedicineSessionWhereInput =
      {
        ...(appointmentId && {
          appointmentId,
        }),

        ...(encounterId && {
          encounterId,
        }),

        ...(provider && {
          provider: {
            contains: provider,
            mode: 'insensitive',
          },
        }),

        ...(status && {
          status,
        }),
      };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.telemedicineSession.findMany({
          where,

          include: {
            appointment: true,
            encounter: true,
            participants: true,
          },

          orderBy: {
            scheduledStart: 'desc',
          },

          skip:
            (page - 1) * limit,

          take: limit,
        }),

        this.prisma.telemedicineSession.count({
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
    const session =
      await this.prisma.telemedicineSession.findUnique({
        where: {
          id,
        },

        include: {
          appointment: true,
          encounter: true,
          participants: {
            include: {
              user: true,
            },
          },
          events: true,
          telemedicineChats: {
            include: {
              sender: true,
            },
          },
          telemedicineConsents: {
            include: {
              patient: true,
            },
          },
        },
      });

    if (!session) {
      throw new NotFoundException(
        'Telemedicine session not found.',
      );
    }

    return session;
  }

  async update(
    id: string,
    dto: UpdateTelemedicineSessionDto,
  ) {
    const session =
      await this.prisma.telemedicineSession.findUnique({
        where: {
          id,
        },
      });

    if (!session) {
      throw new NotFoundException(
        'Telemedicine session not found.',
      );
    }

    if (
      dto.appointmentId &&
      dto.appointmentId !==
        session.appointmentId
    ) {
      const appointment =
        await this.prisma.appointment.findUnique({
          where: {
            id: dto.appointmentId,
          },
        });

      if (!appointment) {
        throw new NotFoundException(
          'Appointment not found.',
        );
      }
    }

    if (
      dto.encounterId &&
      dto.encounterId !==
        session.encounterId
    ) {
      const encounter =
        await this.prisma.encounter.findUnique({
          where: {
            id: dto.encounterId,
          },
        });

      if (!encounter) {
        throw new NotFoundException(
          'Encounter not found.',
        );
      }
    }

    if (
      dto.meetingId &&
      dto.meetingId !== session.meetingId
    ) {
      const existing =
        await this.prisma.telemedicineSession.findUnique({
          where: {
            meetingId: dto.meetingId,
          },
        });

      if (
        existing &&
        existing.id !== id
      ) {
        throw new ConflictException(
          'Meeting ID already exists.',
        );
      }
    }

    return this.prisma.telemedicineSession.update({
      where: {
        id,
      },

      data: {
        ...(dto.appointmentId !== undefined && {
          appointmentId: dto.appointmentId,
        }),

        ...(dto.encounterId !== undefined && {
          encounterId: dto.encounterId,
        }),

        ...(dto.meetingId !== undefined && {
          meetingId: dto.meetingId,
        }),

        ...(dto.provider !== undefined && {
          provider: dto.provider,
        }),

        ...(dto.joinUrl !== undefined && {
          joinUrl: dto.joinUrl,
        }),

        ...(dto.hostUrl !== undefined && {
          hostUrl: dto.hostUrl,
        }),

        ...(dto.recordingUrl !== undefined && {
          recordingUrl: dto.recordingUrl,
        }),

        ...(dto.status !== undefined && {
          status: dto.status,
        }),

        ...(dto.scheduledStart !== undefined && {
          scheduledStart: dto.scheduledStart,
        }),

        ...(dto.scheduledEnd !== undefined && {
          scheduledEnd: dto.scheduledEnd,
        }),

        ...(dto.actualStart !== undefined && {
          actualStart: dto.actualStart,
        }),

        ...(dto.actualEnd !== undefined && {
          actualEnd: dto.actualEnd,
        }),

        ...(dto.waitingRoomEnabled !== undefined && {
          waitingRoomEnabled:
            dto.waitingRoomEnabled,
        }),

        ...(dto.recordingEnabled !== undefined && {
          recordingEnabled:
            dto.recordingEnabled,
        }),

        ...(dto.chatEnabled !== undefined && {
          chatEnabled:
            dto.chatEnabled,
        }),

        ...(dto.screenSharingEnabled !== undefined && {
          screenSharingEnabled:
            dto.screenSharingEnabled,
        }),

        ...(dto.notes !== undefined && {
          notes: dto.notes,
        }),
      },

      include: {
        appointment: true,
        encounter: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    const session =
      await this.prisma.telemedicineSession.findUnique({
        where: {
          id,
        },
      });

    if (!session) {
      throw new NotFoundException(
        'Telemedicine session not found.',
      );
    }

    await this.prisma.telemedicineSession.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Telemedicine session deleted successfully.',
    };
  }
}