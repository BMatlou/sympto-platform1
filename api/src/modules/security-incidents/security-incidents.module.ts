import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SecurityIncidentsController } from './security-incidents.controller';
import { SecurityIncidentsService } from './security-incidents.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    SecurityIncidentsController,
  ],

  providers: [
    SecurityIncidentsService,
  ],

  exports: [
    SecurityIncidentsService,
  ],
})
export class SecurityIncidentsModule {}