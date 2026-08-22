import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImmunizationsController } from './immunizations.controller';
import { ImmunizationsService } from './immunizations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImmunizationsController],
  providers: [ImmunizationsService],
  exports: [ImmunizationsService],
})
export class ImmunizationsModule {}