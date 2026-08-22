import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { TelemedicineConsentsController } from './telemedicine-consents.controller';
import { TelemedicineConsentsService } from './telemedicine-consents.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    TelemedicineConsentsController,
  ],

  providers: [
    TelemedicineConsentsService,
  ],

  exports: [
    TelemedicineConsentsService,
  ],
})
export class TelemedicineConsentsModule {}