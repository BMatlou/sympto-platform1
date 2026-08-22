import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { LabCategoriesController } from './lab-categories.controller';
import { LabCategoriesService } from './lab-categories.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabCategoriesController],
  providers: [LabCategoriesService],
  exports: [LabCategoriesService],
})
export class LabCategoriesModule {}