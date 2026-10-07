import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmartFileClinicalService } from './smart-file-clinical.service';
import { SmartFileClinicalWriteService } from './smart-file-clinical-write.service';
import { CreateSmartFileClinicalUpdateDto } from './dto/create-smart-file-clinical-update.dto';
import { SmartFileClinicalWriteDto } from './dto/smart-file-clinical-write.dto';

type AuthenticatedRequest = {
  user?: {
    id?: string;
    sub?: string;
  };
};

@ApiTags('Smart File')
@ApiBearerAuth()
@Controller('smart-file')
@UseGuards(JwtAuthGuard)
export class SmartFileClinicalController {
  constructor(
    private readonly smartFileClinicalService: SmartFileClinicalService,
    private readonly smartFileClinicalWriteService: SmartFileClinicalWriteService,
  ) {}

  @Get('clinical/:consentId')
  getClinicalFile(
    @Req() req: AuthenticatedRequest,
    @Param('consentId') consentId: string,
  ) {
    return this.smartFileClinicalService.getClinicalFile(
      this.userId(req),
      consentId,
    );
  }

  @Get('clinical/:consentId/medications')
  searchMedications(
    @Req() req: AuthenticatedRequest,
    @Param('consentId') consentId: string,
    @Query('search') search?: string,
  ) {
    return this.smartFileClinicalService.searchMedications(
      this.userId(req),
      consentId,
      search,
    );
  }

  @Post('clinical/:consentId/write')
  writeClinicalRecord(
    @Req() req: AuthenticatedRequest,
    @Param('consentId') consentId: string,
    @Body() dto: SmartFileClinicalWriteDto,
  ) {
    return this.smartFileClinicalWriteService.write(
      this.userId(req),
      consentId,
      dto,
    );
  }

  @Post('clinical/:consentId/updates')
  createClinicalUpdate(
    @Req() req: AuthenticatedRequest,
    @Param('consentId') consentId: string,
    @Body() dto: CreateSmartFileClinicalUpdateDto,
  ) {
    return this.smartFileClinicalService.createClinicalUpdate(
      this.userId(req),
      consentId,
      dto,
    );
  }

  private userId(req: AuthenticatedRequest) {
    const userId = req.user?.id ?? req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user ID is missing.');
    }

    return userId;
  }
}
