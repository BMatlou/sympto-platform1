import {
  Controller,
  Get,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmartFileClinicalService } from './smart-file-clinical.service';

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
  constructor(private readonly smartFileClinicalService: SmartFileClinicalService) {}

  @Get('clinical/:consentId')
  getClinicalFile(
    @Req() req: AuthenticatedRequest,
    @Param('consentId') consentId: string,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user ID is missing.');
    }

    return this.smartFileClinicalService.getClinicalFile(userId, consentId);
  }
}
