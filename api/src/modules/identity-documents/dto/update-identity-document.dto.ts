import { PartialType } from '@nestjs/mapped-types';

import { CreateIdentityDocumentDto } from './create-identity-document.dto';

export class UpdateIdentityDocumentDto extends PartialType(
  CreateIdentityDocumentDto,
) {}