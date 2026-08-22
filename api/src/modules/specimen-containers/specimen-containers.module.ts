import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SpecimenContainersController } from './specimen-containers.controller';
import { SpecimenContainersService } from './specimen-containers.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    SpecimenContainersController,
  ],

  providers: [
    SpecimenContainersService,
  ],

  exports: [
    SpecimenContainersService,
  ],
})
export class SpecimenContainersModule {}