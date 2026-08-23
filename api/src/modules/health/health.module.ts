import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HealthController } from './health.controller';
import { HealthHomeController } from './health-home.controller';
import { HealthHomeService } from './health-home.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, HealthHomeController],
  providers: [HealthHomeService],
})
export class HealthModule {}
