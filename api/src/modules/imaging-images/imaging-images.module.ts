import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';

import { ImagingImagesController } from './imaging-images.controller';
import { ImagingImagesService } from './imaging-images.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagingImagesController],
  providers: [ImagingImagesService],
  exports: [ImagingImagesService],
})
export class ImagingImagesModule {}