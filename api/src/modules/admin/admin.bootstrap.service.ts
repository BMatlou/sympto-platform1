import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminBootstrapService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async bootstrap() {
    const email = 'admin@sympto.local';

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('✅ Admin already exists');
      return;
    }

    const adminRole = await this.prisma.role.findUnique({
      where: {
        name: 'ADMIN',
      },
    });

    if (!adminRole) {
      throw new Error('ADMIN role not found');
    }

    const passwordHash = await argon2.hash('Admin123!');

    await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          firstName: 'System',
          lastName: 'Administrator',
        },
      });

      const user = await tx.user.create({
        data: {
          personId: person.id,
          email,
          username: 'admin',
          passwordHash,
          userType: 'ADMIN',
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
    });

    console.log('✅ Default administrator created');
    console.log('Email: admin@sympto.local');
    console.log('Password: Admin123!');
  }
}