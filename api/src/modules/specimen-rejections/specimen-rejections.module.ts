import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SpecimenRejectionsController } from './specimen-rejections.controller';
import { SpecimenRejectionsService } from './specimen-rejections.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SpecimenRejectionsController],
  providers: [SpecimenRejectionsService],
  exports: [SpecimenRejectionsService],
})
export class SpecimenRejectionsModule {}