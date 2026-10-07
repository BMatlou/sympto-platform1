import {
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
} from 'class-validator';

export enum SmartFileClinicalWriteAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
}

export enum SmartFileClinicalWriteSection {
  ENCOUNTER = 'ENCOUNTER',
  DIAGNOSIS = 'DIAGNOSIS',
  PROCEDURE = 'PROCEDURE',
  VITAL = 'VITAL',
  SYMPTOM_EPISODE = 'SYMPTOM_EPISODE',
  SYMPTOM_LOG = 'SYMPTOM_LOG',
  SYMPTOM_ITEM = 'SYMPTOM_ITEM',
  CLINICAL_NOTE = 'CLINICAL_NOTE',
  PRESCRIPTION = 'PRESCRIPTION',
  PRESCRIPTION_ITEM = 'PRESCRIPTION_ITEM',
  PATIENT_MEDICATION = 'PATIENT_MEDICATION',
  HEALTH_PASSPORT = 'HEALTH_PASSPORT',
  MEDICAL_RECORD = 'MEDICAL_RECORD',
  CONDITION = 'CONDITION',
  ALLERGY = 'ALLERGY',
  IMMUNIZATION = 'IMMUNIZATION',
  CARE_PLAN = 'CARE_PLAN',
  CARE_PLAN_GOAL = 'CARE_PLAN_GOAL',
  CARE_PLAN_TASK = 'CARE_PLAN_TASK',
  CARE_PLAN_NOTE = 'CARE_PLAN_NOTE',
  REFERRAL = 'REFERRAL',
  REFERRAL_NOTE = 'REFERRAL_NOTE',
  LAB_ORDER = 'LAB_ORDER',
  IMAGING_ORDER = 'IMAGING_ORDER',
  IMAGING_REPORT = 'IMAGING_REPORT',
  HEALTH_JOURNAL = 'HEALTH_JOURNAL',
}

export class SmartFileClinicalWriteDto {
  @IsEnum(SmartFileClinicalWriteSection)
  section!: SmartFileClinicalWriteSection;

  @IsEnum(SmartFileClinicalWriteAction)
  action!: SmartFileClinicalWriteAction;

  @IsOptional()
  @IsUUID()
  id?: string;

  @IsObject()
  data!: Record<string, unknown>;
}
