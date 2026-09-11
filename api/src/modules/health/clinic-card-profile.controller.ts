import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClinicCardProfileService, UpdateClinicCardProfileInput } from './clinic-card-profile.service';

@Controller('clinic-card')
@UseGuards(AuthGuard('jwt'))
export class ClinicCardProfileController {
  constructor(private readonly clinicCardProfileService: ClinicCardProfileService) {}

  @Patch('profile')
  update(@Req() req: any, @Body() body: UpdateClinicCardProfileInput) {
    return this.clinicCardProfileService.update(req.user.id, body);
  }
}
