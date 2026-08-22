import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PersonAddressesController } from './person-addresses.controller';
import { PersonAddressesService } from './person-addresses.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PersonAddressesController],
  providers: [PersonAddressesService],
  exports: [PersonAddressesService],
})
export class PersonAddressesModule {}