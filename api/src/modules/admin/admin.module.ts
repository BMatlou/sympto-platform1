import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminBootstrapService } from './admin.bootstrap.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    AdminController,
  ],

  providers: [
    AdminService,
    AdminBootstrapService,
  ],

  exports: [
    AdminBootstrapService,
  ],
})
export class AdminModule {}