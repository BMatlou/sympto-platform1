import { PartialType } from '@nestjs/mapped-types';
import { CreateClaimStatusHistoryDto } from './create-claim-status-history.dto';

export class UpdateClaimStatusHistoryDto extends PartialType(CreateClaimStatusHistoryDto) {}
