import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PatientAllergyItemDto } from './dto/update-patient-allergies.dto';
import { PatientConditionItemDto } from './dto/update-patient-conditions.dto';
import { PatientImmunizationItemDto } from './dto/update-patient-immunizations.dto';

@Controller('patient-health-records')
@UseGuards(JwtAuthGuard)
export class PatientHealthRecordController {
  constructor(private readonly prisma: PrismaService) {}

  private async patientContext(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: { healthPassport: true },
    });
    if (!patient?.healthPassport) {
      throw new NotFoundException('Patient health passport not found.');
    }
    return patient;
  }

  private assertPatientOwned(recordPassportId: string, passportId: string) {
    if (recordPassportId !== passportId) {
      throw new ForbiddenException('You can only manage your own patient health records.');
    }
  }

  @Get('clinical-diagnoses')
  async clinicalDiagnoses(@Req() req: any) {
    const patient = await this.patientContext(req.user.sub);
    return this.prisma.patientDiagnosis.findMany({
      where: { healthPassportId: patient.healthPassport!.id },
      include: { diagnosis: true, encounter: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post('allergies')
  async createAllergy(@Req() req: any, @Body() dto: PatientAllergyItemDto) {
    const patient = await this.patientContext(req.user.sub);
    const allergy = await this.prisma.allergy.findUnique({ where: { id: dto.allergyId } });
    if (!allergy) throw new NotFoundException('Allergy not found.');
    const existing = await this.prisma.patientAllergy.findFirst({ where: { healthPassportId: patient.healthPassport!.id, allergyId: dto.allergyId } });
    if (existing) throw new ConflictException('This allergy is already recorded.');

    return this.prisma.patientAllergy.create({
      data: {
        healthPassportId: patient.healthPassport!.id,
        allergyId: dto.allergyId,
        severity: dto.severity,
        reaction: dto.reaction?.trim(),
        reactionNotes: dto.reactionNotes?.trim(),
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
        lastReaction: dto.lastReaction ? new Date(dto.lastReaction) : undefined,
        verified: false,
        status: dto.status ?? 'ACTIVE',
        notes: dto.notes?.trim(),
      },
      include: { allergy: true },
    });
  }

  @Patch('allergies/:id')
  async updateAllergy(@Req() req: any, @Param('id') id: string, @Body() dto: PatientAllergyItemDto) {
    const patient = await this.patientContext(req.user.sub);
    const existing = await this.prisma.patientAllergy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Patient allergy not found.');
    this.assertPatientOwned(existing.healthPassportId, patient.healthPassport!.id);
    if (existing.verified || existing.verifiedBy) {
      throw new ForbiddenException('Clinician-verified allergies cannot be edited by the patient.');
    }
    return this.prisma.patientAllergy.update({
      where: { id },
      data: {
        allergyId: dto.allergyId,
        severity: dto.severity,
        reaction: dto.reaction?.trim(),
        reactionNotes: dto.reactionNotes?.trim(),
        onsetDate: dto.onsetDate ? new Date(dto.onsetDate) : undefined,
        lastReaction: dto.lastReaction ? new Date(dto.lastReaction) : undefined,
        status: dto.status ?? existing.status,
        notes: dto.notes?.trim(),
      },
      include: { allergy: true },
    });
  }

  @Delete('allergies/:id')
  async deleteAllergy(@Req() req: any, @Param('id') id: string) {
    const patient = await this.patientContext(req.user.sub);
    const existing = await this.prisma.patientAllergy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Patient allergy not found.');
    this.assertPatientOwned(existing.healthPassportId, patient.healthPassport!.id);
    if (existing.verified || existing.verifiedBy) {
      throw new ForbiddenException('Clinician-verified allergies cannot be removed by the patient.');
    }
    await this.prisma.patientAllergy.delete({ where: { id } });
    return { message: 'Patient allergy removed.' };
  }

  @Post('conditions')
  async createCondition(@Req() req: any, @Body() dto: PatientConditionItemDto) {
    const patient = await this.patientContext(req.user.sub);
    const condition = await this.prisma.condition.findUnique({ where: { id: dto.conditionId } });
    if (!condition) throw new NotFoundException('Condition not found.');
    const existing = await this.prisma.patientCondition.findFirst({ where: { healthPassportId: patient.healthPassport!.id, conditionId: dto.conditionId } });
    if (existing) throw new ConflictException('This condition is already recorded.');

    return this.prisma.patientCondition.create({
      data: {
        healthPassportId: patient.healthPassport!.id,
        conditionId: dto.conditionId,
        diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : undefined,
        resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
        status: dto.status ?? 'ACTIVE',
        severity: dto.severity,
        stage: dto.stage,
        chronic: dto.chronic ?? false,
        primaryCondition: dto.primaryCondition ?? false,
        notes: dto.notes?.trim(),
      },
      include: { condition: true },
    });
  }

  @Patch('conditions/:id')
  async updateCondition(@Req() req: any, @Param('id') id: string, @Body() dto: PatientConditionItemDto) {
    const patient = await this.patientContext(req.user.sub);
    const existing = await this.prisma.patientCondition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Patient condition not found.');
    this.assertPatientOwned(existing.healthPassportId, patient.healthPassport!.id);
    if (existing.diagnosedBy || existing.treatmentPlan) {
      throw new ForbiddenException('Clinician-recorded conditions cannot be edited by the patient.');
    }
    return this.prisma.patientCondition.update({
      where: { id },
      data: {
        conditionId: dto.conditionId,
        diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : undefined,
        resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
        status: dto.status ?? existing.status,
        severity: dto.severity,
        stage: dto.stage,
        chronic: dto.chronic,
        primaryCondition: dto.primaryCondition,
        notes: dto.notes?.trim(),
      },
      include: { condition: true },
    });
  }

  @Delete('conditions/:id')
  async deleteCondition(@Req() req: any, @Param('id') id: string) {
    const patient = await this.patientContext(req.user.sub);
    const existing = await this.prisma.patientCondition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Patient condition not found.');
    this.assertPatientOwned(existing.healthPassportId, patient.healthPassport!.id);
    if (existing.diagnosedBy || existing.treatmentPlan) {
      throw new ForbiddenException('Clinician-recorded conditions cannot be removed by the patient.');
    }
    await this.prisma.patientCondition.delete({ where: { id } });
    return { message: 'Patient condition removed.' };
  }

  @Post('immunizations')
  async createImmunization(@Req() req: any, @Body() dto: PatientImmunizationItemDto) {
    const patient = await this.patientContext(req.user.sub);
    const immunization = await this.prisma.immunization.findUnique({ where: { id: dto.immunizationId } });
    if (!immunization) throw new NotFoundException('Immunization not found.');
    const doseNumber = dto.doseNumber ?? 1;
    const existing = await this.prisma.patientImmunization.findFirst({ where: { healthPassportId: patient.healthPassport!.id, immunizationId: dto.immunizationId, doseNumber } });
    if (existing) throw new ConflictException('This immunisation dose is already recorded.');

    return this.prisma.patientImmunization.create({
      data: {
        healthPassportId: patient.healthPassport!.id,
        immunizationId: dto.immunizationId,
        administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : undefined,
        doseNumber,
        batchNumber: dto.batchNumber?.trim(),
        manufacturer: dto.manufacturer?.trim(),
        administeredBy: dto.administeredBy?.trim(),
        facility: dto.facility?.trim(),
        route: dto.route?.trim(),
        site: dto.site?.trim(),
        adverseReaction: dto.adverseReaction ?? false,
        adverseReactionNotes: dto.adverseReactionNotes?.trim(),
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        notes: dto.notes?.trim(),
      },
      include: { immunization: true },
    });
  }

  @Patch('immunizations/:id')
  async updateImmunization(@Req() req: any, @Param('id') id: string, @Body() dto: PatientImmunizationItemDto) {
    const patient = await this.patientContext(req.user.sub);
    const existing = await this.prisma.patientImmunization.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Patient immunisation not found.');
    this.assertPatientOwned(existing.healthPassportId, patient.healthPassport!.id);
    if (existing.administeredBy || existing.facility) {
      throw new ForbiddenException('Clinician-recorded vaccinations cannot be edited by the patient.');
    }
    return this.prisma.patientImmunization.update({
      where: { id },
      data: {
        immunizationId: dto.immunizationId,
        administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : undefined,
        doseNumber: dto.doseNumber ?? existing.doseNumber,
        batchNumber: dto.batchNumber?.trim(),
        manufacturer: dto.manufacturer?.trim(),
        route: dto.route?.trim(),
        site: dto.site?.trim(),
        adverseReaction: dto.adverseReaction ?? existing.adverseReaction,
        adverseReactionNotes: dto.adverseReactionNotes?.trim(),
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
        notes: dto.notes?.trim(),
      },
      include: { immunization: true },
    });
  }

  @Delete('immunizations/:id')
  async deleteImmunization(@Req() req: any, @Param('id') id: string) {
    const patient = await this.patientContext(req.user.sub);
    const existing = await this.prisma.patientImmunization.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Patient immunisation not found.');
    this.assertPatientOwned(existing.healthPassportId, patient.healthPassport!.id);
    if (existing.administeredBy || existing.facility) {
      throw new ForbiddenException('Clinician-recorded vaccinations cannot be removed by the patient.');
    }
    await this.prisma.patientImmunization.delete({ where: { id } });
    return { message: 'Patient immunisation removed.' };
  }
}
