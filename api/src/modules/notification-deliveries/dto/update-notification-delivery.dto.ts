import { PartialType } from '@nestjs/mapped-types';

import { CreateNotificationDeliveryDto } from './create-notification-delivery.dto';

export class UpdateNotificationDeliveryDto extends PartialType(
  CreateNotificationDeliveryDto,
) {}