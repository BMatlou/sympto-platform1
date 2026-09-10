import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SmartFileClinicalController } from './smart-file-clinical.controller';
import { SmartFileClinicalService } from './smart-file-clinical.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SmartFileClinicalController],
  providers: [SmartFileClinicalService],
  exports: [SmartFileClinicalService],
})
export class SmartFileClinicalModule {}
