import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ComplianceIssuesController } from './compliance-issues.controller';
import { ComplianceIssuesService } from './compliance-issues.service';

@Module({
  imports: [
    DatabaseModule,
  ],

  controllers: [
    ComplianceIssuesController,
  ],

  providers: [
    ComplianceIssuesService,
  ],

  exports: [
    ComplianceIssuesService,
  ],
})
export class ComplianceIssuesModule {}