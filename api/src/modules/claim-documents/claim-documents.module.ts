import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ClaimDocumentsController } from './claim-documents.controller';
import { ClaimDocumentsService } from './claim-documents.service';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [
    ClaimDocumentsController,
  ],
  providers: [
    ClaimDocumentsService,
  ],
  exports: [
    ClaimDocumentsService,
  ],
})
export class ClaimDocumentsModule {}