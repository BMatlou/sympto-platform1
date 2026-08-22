import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabOrdersController } from './lab-orders.controller';
import { LabOrdersService } from './lab-orders.service';

@Module({
  imports: [DatabaseModule],

  controllers: [LabOrdersController],

  providers: [LabOrdersService],

  exports: [LabOrdersService],
})
export class LabOrdersModule {}