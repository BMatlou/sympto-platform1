import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { InsurancePoliciesController } from './insurance-policies.controller';
import { InsurancePoliciesService } from './insurance-policies.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    InsurancePoliciesController,
  ],
  providers: [
    InsurancePoliciesService,
  ],
 exports: [
    InsurancePoliciesService,
  ],
})
export class InsurancePoliciesModule {}