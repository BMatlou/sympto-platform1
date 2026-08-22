import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { AllergiesController } from './allergies.controller';
import { AllergiesService } from './allergies.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AllergiesController],
  providers: [AllergiesService],
  exports: [AllergiesService],
})
export class AllergiesModule {}