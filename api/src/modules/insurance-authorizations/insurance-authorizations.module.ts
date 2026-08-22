import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { InsuranceAuthorizationsController } from './insurance-authorizations.controller';
import { InsuranceAuthorizationsService } from './insurance-authorizations.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    InsuranceAuthorizationsController,
  ],
  providers: [
    InsuranceAuthorizationsService,
  ],
  exports: [
    InsuranceAuthorizationsService,
  ],
})
export class InsuranceAuthorizationsModule {}