import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: {
        name: 'asc',
      },

      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }
}