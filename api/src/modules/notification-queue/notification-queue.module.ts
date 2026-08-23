import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationQueueController } from './notification-queue.controller';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessorService } from '../notification-processor/notification-processor.service';
import { MedicationAdherenceController } from '../medication-adherence/medication-adherence.controller';
import { MedicationAdherenceService } from '../medication-adherence/medication-adherence.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationQueueController, MedicationAdherenceController],
  providers: [NotificationQueueService, NotificationProcessorService, MedicationAdherenceService],
  exports: [NotificationQueueService, MedicationAdherenceService],
})
export class NotificationQueueModule {}
