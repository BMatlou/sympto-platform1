import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { InsuranceBenefitsController } from './insurance-benefits.controller';
import { InsuranceBenefitsService } from './insurance-benefits.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    InsuranceBenefitsController,
  ],
  providers: [
    InsuranceBenefitsService,
  ],
  exports: [
    InsuranceBenefitsService,
  ],
})
export class InsuranceBenefitsModule {}