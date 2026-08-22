import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';

@Module({
  imports: [DatabaseModule],

  controllers: [FamilyController],

  providers: [FamilyService],

  exports: [FamilyService],
})
export class FamilyModule {}