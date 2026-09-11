import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { SmartFileConsentService } from './smart-file-consent.service';
import { SmartFileShareCredentialDto } from './dto/smart-file-share.dto';

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
export class SmartFileConsentController {
  constructor(private readonly smartFileConsentService: SmartFileConsentService) {}

  @Post('share')
  createClinicalShare(@Req() req: AuthenticatedRequest) {
    return this.smartFileConsentService.createClinicalShareSession(this.userId(req));
  }

  @Post('prescription-share')
  createPrescriptionShare(@Req() req: AuthenticatedRequest) {
    return this.smartFileConsentService.createPrescriptionShareSession(this.userId(req));
  }

  @Post('authorize')
  authorizeClinicalShare(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SmartFileShareCredentialDto,
  ) {
    return this.smartFileConsentService.authorizeClinicalShare(
      this.userId(req),
      dto.code,
    );
  }

  @Post('authorize-pharmacy')
  authorizePrescriptionShare(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SmartFileShareCredentialDto,
  ) {
    return this.smartFileConsentService.authorizePrescriptionShare(
      this.userId(req),
      dto.code,
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
