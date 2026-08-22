import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { CarePlansController } from './care-plans.controller';
import { CarePlansService } from './care-plans.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CarePlansController],
  providers: [CarePlansService],
  exports: [CarePlansService],
})
export class CarePlansModule {}