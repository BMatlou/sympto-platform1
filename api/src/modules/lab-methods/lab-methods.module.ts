import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabMethodsController } from './lab-methods.controller';
import { LabMethodsService } from './lab-methods.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabMethodsController],
  providers: [LabMethodsService],
  exports: [LabMethodsService],
})
export class LabMethodsModule {}