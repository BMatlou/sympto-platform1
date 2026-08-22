import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DispensationsController } from './dispensations.controller';
import { DispensationsService } from './dispensations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DispensationsController],
  providers: [DispensationsService],
  exports: [DispensationsService],
})
export class DispensationsModule {}