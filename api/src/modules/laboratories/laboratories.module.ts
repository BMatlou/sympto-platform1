import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LaboratoriesController } from './laboratories.controller';
import { LaboratoriesService } from './laboratories.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LaboratoriesController],
  providers: [LaboratoriesService],
  exports: [LaboratoriesService],
})
export class LaboratoriesModule {}