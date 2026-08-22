import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
  private readonly reflector: Reflector,
  private readonly prisma: PrismaService,
) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        'permissions',
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      return false;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: {
        id: user.sub,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return false;
    }

    const permissions = dbUser.roles.flatMap((role) =>
      role.role.permissions.map(
        (permission) => permission.permission.name,
      ),
    );

    return requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
  }
}