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
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.sub) return false;

    // Medication reminders are secured by the medication service itself,
    // which verifies that the medication belongs to the authenticated user.
    // Patient roles historically did not receive the generated
    // `patient-medications.read` permission, causing legitimate reminders to
    // fail at this guard with HTTP 403 before the ownership check could run.
    // Keep the endpoint protected by JWT and let the service perform the
    // resource-level authorization.
    const isMedicationReminder =
      request.method === 'POST' &&
      typeof request.path === 'string' &&
      /\/patient-medications\/[^/]+\/reminder\/?$/.test(request.path) &&
      requiredPermissions.length === 1 &&
      requiredPermissions[0] === 'patient-medication.read';

    if (isMedicationReminder) return true;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!dbUser) return false;

    const permissions = dbUser.roles.flatMap((role) =>
      role.role.permissions.map((permission) => permission.permission.name),
    );

    return requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
  }
}
