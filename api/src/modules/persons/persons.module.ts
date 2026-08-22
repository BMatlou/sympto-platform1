import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}