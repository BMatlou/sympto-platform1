import { PartialType } from '@nestjs/mapped-types';
import { CreateClaimDocumentDto } from './create-claim-document.dto';

export class UpdateClaimDocumentDto extends PartialType(CreateClaimDocumentDto) {}
