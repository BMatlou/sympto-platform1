import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { VitalTypesController } from './vital-types.controller';
import { VitalTypesService } from './vital-types.service';

@Module({
  imports: [DatabaseModule],
  controllers: [VitalTypesController],
  providers: [VitalTypesService],
  exports: [VitalTypesService],
})
export class VitalTypesModule {}