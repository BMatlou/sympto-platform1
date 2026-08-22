import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { InsuranceProvidersController } from './insurance-providers.controller';
import { InsuranceProvidersService } from './insurance-providers.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    InsuranceProvidersController,
  ],
  providers: [
    InsuranceProvidersService,
  ],
  exports: [
    InsuranceProvidersService,
  ],
})
export class InsuranceProvidersModule {}