import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SpecimenTypesController } from './specimen-types.controller';
import { SpecimenTypesService } from './specimen-types.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    SpecimenTypesController,
  ],

  providers: [
    SpecimenTypesService,
  ],

  exports: [
    SpecimenTypesService,
  ],
})
export class SpecimenTypesModule {}