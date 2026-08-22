import { PartialType } from '@nestjs/mapped-types';

import { CreateNotificationQueueDto } from './create-notification-queue.dto';

export class UpdateNotificationQueueDto extends PartialType(
  CreateNotificationQueueDto,
) {}