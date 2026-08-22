import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PractitionerStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

import { CreatePractitionerDto } from './dto/create-practitioner.dto';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';
import { QueryPractitionerDto } from './dto/query-practitioner.dto';

@Injectable()
export class PractitionersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePractitionerDto,
  ) {
    const person =
      await this.prisma.person.findUnique({
        where: {
          id: dto.personId,
        },
      });

    if (!person) {
      throw new NotFoundException(
        'Person not found.',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found.',
      );
    }

    if (dto.departmentId) {
      const department =
        await this.prisma.department.findUnique({
          where: {
            id: dto.departmentId,
          },
        });

      if (!department) {
        throw new NotFoundException(
          'Department not found.',
        );
      }
    }

    console.log("=== CHECKING DUPLICATE PRACTITIONER ===");
console.log({
  personId: dto.personId,
  userId: dto.userId,
  registrationNumber: dto.registrationNumber,
});

console.log("=== CHECKING DUPLICATE PRACTITIONER ===");
console.log({
  personId: dto.personId,
  userId: dto.userId,
  registrationNumber: dto.registrationNumber,
});

console.log("=== CHECKING DUPLICATE PRACTITIONER ===");
console.log({
  personId: dto.personId,
  userId: dto.userId,
  registrationNumber: dto.registrationNumber,
});

const duplicate = await this.prisma.practitioner.findFirst({
  where: {
    OR: [
      { registrationNumber: dto.registrationNumber },
      { personId: dto.personId },
      { userId: dto.userId },
    ],
  },
});

console.log("Duplicate record:", duplicate);

if (duplicate) {
  throw new ConflictException("Practitioner already exists.");
}

console.log("Duplicate record:", duplicate);

if (duplicate) {
  throw new ConflictException("Practitioner already exists.");
}

console.log("Duplicate record:", duplicate);

if (duplicate) {
  throw new ConflictException("Practitioner already exists.");
}
    return this.prisma.practitioner.create({
      data: {
        personId: dto.personId,
        userId: dto.userId,
        registrationNumber:
          dto.registrationNumber,
        practiceNumber:
          dto.practiceNumber,
        practitionerType:
          dto.practitionerType,
        status:
          dto.status ??
          PractitionerStatus.PENDING,
        biography:
          dto.biography,
        yearsExperience:
          dto.yearsExperience,
        departmentId:
          dto.departmentId,
        verified:
          dto.verified ?? false,
      },

      include: {
        person: true,
        user: true,
        department: true,
      },
    });
  }

  async findAll(
    query: QueryPractitionerDto,
  ) {
    const {
      page,
      limit,
      departmentId,
      practitionerType,
      status,
      verified,
      search,
    } = query;

    const where: Prisma.PractitionerWhereInput = {
      ...(departmentId && {
        departmentId,
      }),

      ...(practitionerType && {
        practitionerType,
      }),

      ...(status && {
        status,
      }),

      ...(verified !== undefined && {
        verified,
      }),

      ...(search && {
        OR: [
          {
            registrationNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            practiceNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            person: {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  preferredName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        ],
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.practitioner.findMany({
          where,

          include: {
            person: true,
            user: true,
            department: true,
            specialties: true,
            qualifications: true,
            organizations: true,
          },

          orderBy: {
            createdAt: 'desc',
          },

          skip: (page - 1) * limit,

          take: limit,
        }),

        this.prisma.practitioner.count({
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
    const practitioner =
      await this.prisma.practitioner.findUnique({
        where: {
          id,
        },

        include: {
          person: true,
          user: true,
          department: true,
          specialties: true,
          qualifications: true,
          organizations: true,
          availability: true,
          practices: true,
        },
      });

    if (!practitioner) {
      throw new NotFoundException(
        'Practitioner not found.',
      );
    }

    return practitioner;
  }

  async update(
    id: string,
    dto: UpdatePractitionerDto,
  ) {
    await this.findOne(id);

    if (dto.personId) {
      const person =
        await this.prisma.person.findUnique({
          where: {
            id: dto.personId,
          },
        });

      if (!person) {
        throw new NotFoundException(
          'Person not found.',
        );
      }
    }

    if (dto.userId) {
      const user =
        await this.prisma.user.findUnique({
          where: {
            id: dto.userId,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'User not found.',
        );
      }
    }

    if (dto.departmentId) {
      const department =
        await this.prisma.department.findUnique({
          where: {
            id: dto.departmentId,
          },
        });

      if (!department) {
        throw new NotFoundException(
          'Department not found.',
        );
      }
    }

    if (
      dto.registrationNumber ||
      dto.personId ||
      dto.userId
    ) {
      const duplicate =
        await this.prisma.practitioner.findFirst({
          where: {
            NOT: {
              id,
            },
            OR: [
              ...(dto.registrationNumber
                ? [
                    {
                      registrationNumber:
                        dto.registrationNumber,
                    },
                  ]
                : []),
              ...(dto.personId
                ? [
                    {
                      personId: dto.personId,
                    },
                  ]
                : []),
              ...(dto.userId
                ? [
                    {
                      userId: dto.userId,
                    },
                  ]
                : []),
            ],
          },
        });

      if (duplicate) {
        throw new ConflictException(
          'Practitioner already exists.',
        );
      }
    }

    return this.prisma.practitioner.update({
      where: {
        id,
      },

      data: {
        personId: dto.personId,
        userId: dto.userId,
        registrationNumber:
          dto.registrationNumber,
        practiceNumber:
          dto.practiceNumber,
        practitionerType:
          dto.practitionerType,
        status: dto.status,
        biography:
          dto.biography,
        yearsExperience:
          dto.yearsExperience,
        departmentId:
          dto.departmentId,
        verified:
          dto.verified,
      },

      include: {
        person: true,
        user: true,
        department: true,
      },
    });
  }

  async remove(
    id: string,
  ) {
    await this.findOne(id);

    await this.prisma.practitioner.delete({
      where: {
        id,
      },
    });

    return {
      message:
        'Practitioner deleted successfully.',
    };
  }
}