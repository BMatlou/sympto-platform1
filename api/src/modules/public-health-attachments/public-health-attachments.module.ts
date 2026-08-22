import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { PublicHealthAttachmentsController } from './public-health-attachments.controller';
import { PublicHealthAttachmentsService } from './public-health-attachments.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicHealthAttachmentsController],
  providers: [PublicHealthAttachmentsService],
  exports: [PublicHealthAttachmentsService],
})
export class PublicHealthAttachmentsModule {}