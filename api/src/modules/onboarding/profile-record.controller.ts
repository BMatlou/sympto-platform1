import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileRecordService } from './profile-record.service';
import { UpdateProfileRecordDto } from './dto/update-profile-record.dto';

@Controller('profile-record')
@UseGuards(JwtAuthGuard)
export class ProfileRecordController {
  constructor(private readonly profileRecordService: ProfileRecordService) {}

  @Patch()
  async update(@Req() req: any, @Body() dto: UpdateProfileRecordDto) {
    const data = await this.profileRecordService.update(req.user.sub, dto);
    return { success: true, data };
  }
}
