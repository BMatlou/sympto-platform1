import { Injectable } from '@nestjs/common';
import { Prisma, Patient } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../common/base/base.repository';

@Injectable()
export class PatientsRepository extends BaseRepository<
  Patient,
  Prisma.PatientCreateInput,
  Prisma.PatientUpdateInput,
  Prisma.PatientWhereUniqueInput,
  Prisma.PatientWhereInput
> {
  constructor(prisma: PrismaService) {
    super(prisma.patient);
  }
}