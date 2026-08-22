import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PrescriptionItemsController } from './prescription-items.controller';
import { PrescriptionItemsService } from './prescription-items.service';

@Module({
  imports: [DatabaseModule],

  controllers: [PrescriptionItemsController],

  providers: [PrescriptionItemsService],

  exports: [PrescriptionItemsService],
})
export class PrescriptionItemsModule {}