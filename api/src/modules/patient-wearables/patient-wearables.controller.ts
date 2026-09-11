import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { DeviceType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientWearablesService } from './patient-wearables.service';

class ConnectWearableDto {
  @IsString()
  manufacturer!: string;

  @IsString()
  model!: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;
}

class HeartRateDto {
  @IsNumber()
  value!: number;

  @IsDateString()
  measuredAt!: string;

  @IsOptional()
  @IsString()
  source?: string;
}

@ApiTags('Patient Wearables')
@ApiBearerAuth()
@Controller('patient-wearables')
@UseGuards(JwtAuthGuard)
export class PatientWearablesController {
  constructor(private readonly service: PatientWearablesService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.sub);
  }

  @Post('connect')
  connect(@Req() req: any, @Body() dto: ConnectWearableDto) {
    return this.service.connect(req.user.sub, dto);
  }

  @Delete(':deviceId')
  disconnect(@Req() req: any, @Param('deviceId') deviceId: string) {
    return this.service.disconnect(req.user.sub, deviceId);
  }

  @Post(':deviceId/heart-rate')
  recordHeartRate(@Req() req: any, @Param('deviceId') deviceId: string, @Body() dto: HeartRateDto) {
    return this.service.recordHeartRate(req.user.sub, deviceId, dto.value, dto.measuredAt, dto.source);
  }
}
