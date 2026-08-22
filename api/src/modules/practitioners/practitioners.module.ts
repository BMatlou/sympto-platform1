import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PractitionersController],
  providers: [PractitionersService],
  exports: [PractitionersService],
})
export class PractitionersModule {}