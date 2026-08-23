import { Module } from '@nestjs/common';
import { MedicationAdherenceController } from './medication-adherence.controller';
import { MedicationAdherenceService } from './medication-adherence.service';

@Module({
  controllers: [MedicationAdherenceController],
  providers: [MedicationAdherenceService],
})
export class MedicationAdherenceModule {}
