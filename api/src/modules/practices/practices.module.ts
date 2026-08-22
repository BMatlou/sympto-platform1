import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PracticesController } from './practices.controller';
import { PracticesService } from './practices.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PracticesController],
  providers: [PracticesService],
  exports: [PracticesService],
})
export class PracticesModule {}