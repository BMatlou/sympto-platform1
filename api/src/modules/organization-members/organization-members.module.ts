import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { OrganizationMembersController } from './organization-members.controller';
import { OrganizationMembersService } from './organization-members.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    OrganizationMembersController,
  ],
  providers: [
    OrganizationMembersService,
  ],
  exports: [
    OrganizationMembersService,
  ],
})
export class OrganizationMembersModule {}