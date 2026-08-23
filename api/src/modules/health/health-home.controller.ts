import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthHomeService } from './health-home.service';

type AuthenticatedRequest = Request & {
  user: { sub: string };
};

@ApiTags('Health Home')
@ApiBearerAuth()
@Controller('health-home')
@UseGuards(JwtAuthGuard)
export class HealthHomeController {
  constructor(private readonly healthHomeService: HealthHomeService) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.healthHomeService.getForUser(request.user.sub);
  }
}
