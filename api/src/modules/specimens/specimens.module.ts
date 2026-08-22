import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { SpecimensController } from './specimens.controller';
import { SpecimensService } from './specimens.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SpecimensController],
  providers: [SpecimensService],
  exports: [SpecimensService],
})
export class SpecimensModule {}