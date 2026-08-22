import { PartialType } from '@nestjs/mapped-types';

import { CreateTelemedicineChatDto } from './create-telemedicine-chat.dto';

export class UpdateTelemedicineChatDto extends PartialType(
  CreateTelemedicineChatDto,
) {}