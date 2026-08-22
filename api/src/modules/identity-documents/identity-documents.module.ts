import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { IdentityDocumentsController } from './identity-documents.controller';
import { IdentityDocumentsService } from './identity-documents.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IdentityDocumentsController],
  providers: [IdentityDocumentsService],
  exports: [IdentityDocumentsService],
})
export class IdentityDocumentsModule {}