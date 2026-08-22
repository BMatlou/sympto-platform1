import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { DiseaseRegistriesController } from './disease-registries.controller';
import { DiseaseRegistriesService } from './disease-registries.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DiseaseRegistriesController],
  providers: [DiseaseRegistriesService],
  exports: [DiseaseRegistriesService],
})
export class DiseaseRegistriesModule {}