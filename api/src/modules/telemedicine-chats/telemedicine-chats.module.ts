import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { TelemedicineChatsController } from './telemedicine-chats.controller';
import { TelemedicineChatsService } from './telemedicine-chats.service';

@Module({
  imports: [DatabaseModule],

  controllers: [
    TelemedicineChatsController,
  ],

  providers: [
    TelemedicineChatsService,
  ],

  exports: [
    TelemedicineChatsService,
  ],
})
export class TelemedicineChatsModule {}