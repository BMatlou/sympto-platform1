import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { OnboardingRepository } from './onboarding.repository';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { UpdateIndividualProfileDto } from './dto/update-individual-profile.dto';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { UpdatePatientAllergiesDto } from './dto/update-patient-allergies.dto';
import { UpdatePatientConditionsDto } from './dto/update-patient-conditions.dto';
import { UpdatePatientMedicationsDto } from './dto/update-patient-medications.dto';
import { UpdatePatientImmunizationsDto } from './dto/update-patient-immunizations.dto';
import { UpdateHealthGoalsDto } from './dto/update-health-goals.dto';
import { UpdateHealthJournalSettingsDto } from './dto/update-health-journal-settings.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';

const MEDICATION_FREQUENCIES = new Set(['ONCE_DAILY','TWICE_DAILY','THREE_TIMES_DAILY','FOUR_TIMES_DAILY','AS_NEEDED','WEEKLY','OTHER']);
const MEDICATION_ROUTES = new Set(['ORAL','INHALATION','INJECTION','TOPICAL','OPHTHALMIC','OTIC','OTHER']);

@Injectable()
export class OnboardingService {
  constructor(private readonly onboardingRepository: OnboardingRepository, private readonly prisma: PrismaService) {}

  async getProgress(userId: string) { let progress = await this.onboardingRepository.findByUser(userId); if (!progress) progress = await this.onboardingRepository.create(userId); return progress; }
  async updateProgress(userId: string, dto: UpdateProgressDto) { return this.onboardingRepository.update(userId, { currentStep: dto.currentStep, completionPercentage: dto.completionPercentage, status: dto.status, completedAt: dto.status === 'COMPLETED' ? new Date() : null }); }
  private hasAddressUpdate(dto: UpdateProfileDto) { return [dto.addressLine1,dto.addressLine2,dto.suburb,dto.city,dto.province,dto.postalCode,dto.country].some((value) => value !== undefined); }
  private async updatePrimaryAddress(userId: string, dto: UpdateProfileDto) {
    if (!this.hasAddressUpdate(dto)) return;
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { personId: true } });
      if (!user) throw new BadRequestException('User not found.');
      let countryId: string | null | undefined;
      if (dto.country !== undefined) {
        const normalizedCountry = dto.country.trim().toUpperCase();
        if (!normalizedCountry) countryId = null;
        else {
          let country = await tx.country.findUnique({ where: { iso2: normalizedCountry }, select: { id: true } });
          if (!country && normalizedCountry === 'ZA') country = await tx.country.upsert({ where: { iso2: 'ZA' }, update: { iso3:'ZAF',numericCode:'710',name:'South Africa',officialName:'Republic of South Africa',phoneCode:'+27',searchable:true,active:true }, create: { iso2:'ZA',iso3:'ZAF',numericCode:'710',name:'South Africa',officialName:'South Africa',phoneCode:'+27',searchable:true,active:true }, select: { id:true } });
          if (!country) throw new BadRequestException(`Selected country could not be found for ISO-2 code ${normalizedCountry}.`);
          countryId = country.id;
        }
      }
      const primary = await tx.personAddress.findFirst({ where: { personId:user.personId,type:'HOME',isPrimary:true }, include:{ address:true } });
      if (primary) await tx.address.update({ where:{ id:primary.addressId }, data:{ line1:dto.addressLine1 ?? primary.address.line1,line2:dto.addressLine2 !== undefined ? dto.addressLine2 : primary.address.line2,suburb:dto.suburb !== undefined ? dto.suburb : primary.address.suburb,city:dto.city ?? primary.address.city,province:dto.province !== undefined ? dto.province : primary.address.province,postalCode:dto.postalCode !== undefined ? dto.postalCode : primary.address.postalCode,countryId } });
      else { const address = await tx.address.create({ data:{ line1:dto.addressLine1 ?? '',line2:dto.addressLine2 ?? null,suburb:dto.suburb ?? null,city:dto.city ?? '',province:dto.province ?? null,postalCode:dto.postalCode ?? null,countryId:countryId ?? null } }); await tx.personAddress.create({ data:{ personId:user.personId,addressId:address.id,type:'HOME',isPrimary:true } }); }
    });
  }
  async updateProfile(userId:string,dto:UpdateProfileDto) { const hasOnboardingProfileFields=dto.preferredName!==undefined||dto.dateOfBirth!==undefined||dto.gender!==undefined; const profile=await this.onboardingRepository.updatePersonProfile(userId,dto); await this.updatePrimaryAddress(userId,dto); if(!hasOnboardingProfileFields)return profile; const progress=await this.onboardingRepository.findByUser(userId); if(progress?.status==='COMPLETED')return profile; return this.onboardingRepository.update(userId,{currentStep:2,completionPercentage:10,status:'IN_PROGRESS'}); }
  async updateIndividualProfile(userId:string,dto:UpdateIndividualProfileDto){return this.onboardingRepository.updateIndividualProfile(userId,dto);}
  async updateEmergencyContact(userId:string,dto:UpdateEmergencyContactDto){return this.onboardingRepository.saveEmergencyContact(userId,dto);}
  async updatePatientAllergies(userId:string,dto:UpdatePatientAllergiesDto){return this.onboardingRepository.savePatientAllergies(userId,dto);}
  async updatePatientConditions(userId:string,dto:UpdatePatientConditionsDto){return this.onboardingRepository.savePatientConditions(userId,dto);}
  async updatePatientMedications(userId:string,dto:UpdatePatientMedicationsDto){return this.onboardingRepository.savePatientMedications(userId,dto);}

  private parseMedicationDate(value:string|undefined,field:string):Date|undefined { if(!value)return undefined; const parsed=new Date(value); if(Number.isNaN(parsed.getTime()))throw new BadRequestException(`Invalid medication ${field} date.`); return parsed; }
  private normalizeMedicationFrequency(value:string|undefined):string|undefined { if(value===undefined||value===null||value==='')return undefined; const normalized=value.trim().toUpperCase(); if(!MEDICATION_FREQUENCIES.has(normalized))throw new BadRequestException(`Invalid medication frequency: ${value}.`); return normalized; }
  private normalizeMedicationRoute(value:string|undefined):string|undefined { if(value===undefined||value===null||value==='')return undefined; const normalized=value.trim().toUpperCase(); if(!MEDICATION_ROUTES.has(normalized))throw new BadRequestException(`Invalid medication route: ${value}.`); return normalized; }

  /** Live Medications page save: resolve patient-record IDs separately from medication catalog IDs. */
  async managePatientMedications(userId:string,dto:UpdatePatientMedicationsDto) {
    return this.prisma.$transaction(async (tx) => {
      const patient=await tx.patient.findUnique({where:{userId},select:{id:true,healthPassport:{select:{id:true,patientId:true}}}});
      if(!patient)throw new BadRequestException('Patient not found.');
      const healthPassport=patient.healthPassport;
      if(!healthPassport||healthPassport.patientId!==patient.id)throw new BadRequestException('Health Passport not found for this patient.');
      const healthPassportId=healthPassport.id;

      const existing=await tx.patientMedication.findMany({where:{healthPassportId},select:{id:true,medicationId:true}});
      const existingById=new Map(existing.map((item)=>[item.id,item]));
      const processedMedications=await Promise.all(dto.medications.map(async (item)=>{
        if(item.patientMedicationId&&(!item.medicationId||item.medicationId.trim()==='')){
          const existingMedication=existingById.get(item.patientMedicationId) ?? await tx.patientMedication.findUnique({where:{id:item.patientMedicationId},select:{id:true,medicationId:true}});
          if(!existingMedication)throw new BadRequestException('One or more medication records do not belong to this patient.');
          return {...item,medicationId:existingMedication.medicationId};
        }
        if(item.patientMedicationId&&!existingById.has(item.patientMedicationId))throw new BadRequestException('One or more medication records do not belong to this patient.');
        return item;
      }));
      const finalMedications=processedMedications.filter((item)=>Boolean(item.medicationId&&item.medicationId.trim()!==''));

      const submittedMedicationIds=[...new Set(finalMedications.map((item)=>item.medicationId))];
      if(submittedMedicationIds.length>0){
        const medications=await tx.medication.findMany({where:{id:{in:submittedMedicationIds}},select:{id:true}});
        const validMedicationIds=new Set(medications.map((item)=>item.id));
        const missingMedicationId=submittedMedicationIds.find((id)=>!validMedicationIds.has(id));
        if(missingMedicationId)throw new BadRequestException(`Medication ${missingMedicationId} could not be found.`);
      }

      const existingIds=new Set(existing.map((item)=>item.id));
      const submittedExistingIds=new Set<string>();
      const submittedMedicationCounts=new Map<string, number>();
      for(const medication of finalMedications) {
        const medicationId=String(medication.medicationId||'');
        submittedMedicationCounts.set(medicationId,(submittedMedicationCounts.get(medicationId)||0)+1);
      }
      for(const [medicationId,count] of submittedMedicationCounts) {
        if(medicationId && count>1)throw new ConflictException('The same medicine cannot be added more than once.');
      }

      for(const medication of finalMedications){
        const frequency=this.normalizeMedicationFrequency(medication.frequency);
        const route=this.normalizeMedicationRoute(medication.route);
        const startedAt=this.parseMedicationDate(medication.startedAt,'start');
        const endedAt=this.parseMedicationDate(medication.endedAt,'end');
        if(endedAt&&startedAt&&endedAt<startedAt)throw new BadRequestException('Medication stopped date cannot be before the started date.');
        const createData={medicationId:medication.medicationId,dosage:medication.dosage,frequency,route,indication:medication.indication,instructions:medication.instructions,prescribedBy:medication.prescribedBy,startedAt,endedAt,ongoing:medication.ongoing??true,adherencePercentage:medication.adherencePercentage,missedDoses:medication.missedDoses,sideEffects:medication.sideEffects,effectiveness:medication.effectiveness,status:medication.status,notes:medication.notes};
        if(medication.patientMedicationId){
          if(!existingIds.has(medication.patientMedicationId))throw new BadRequestException('One or more medication records do not belong to this patient.');
          const duplicate=await tx.patientMedication.findFirst({where:{healthPassportId,medicationId:createData.medicationId,id:{not:medication.patientMedicationId}},select:{id:true}});
          if(duplicate)throw new ConflictException('This medicine is already in your medication list.');
          submittedExistingIds.add(medication.patientMedicationId);
          await tx.patientMedication.update({where:{id:medication.patientMedicationId},data:{medicationId:createData.medicationId,dosage:createData.dosage??null,frequency:createData.frequency??null,route:createData.route??null,indication:createData.indication??null,instructions:createData.instructions??null,prescribedBy:createData.prescribedBy??null,startedAt:createData.startedAt??null,endedAt:createData.endedAt??null,ongoing:createData.ongoing,adherencePercentage:createData.adherencePercentage,missedDoses:createData.missedDoses,sideEffects:createData.sideEffects??null,effectiveness:createData.effectiveness??null,status:createData.status,notes:createData.notes??null}});
        } else {
          const duplicate=await tx.patientMedication.findFirst({
            where:{healthPassportId,medicationId:createData.medicationId},
            select:{id:true,status:true},
          });

          if(duplicate) {
            const duplicateStatus=String(duplicate.status).toUpperCase();

            // A non-ACTIVE PatientMedication row can be hidden by the live
            // Medications page while still being protected by the
            // healthPassportId + medicationId uniqueness constraint.
            // Reuse and reactivate that existing row instead of creating a
            // second record or returning a misleading 409 Conflict.
            if(duplicateStatus !== 'ACTIVE') {
              console.log(
                '[MED AUDIT] Reactivating hidden PatientMedication record:',
                {
                  patientMedicationId: duplicate.id,
                  medicationId: createData.medicationId,
                  previousStatus: duplicateStatus,
                },
              );

              submittedExistingIds.add(duplicate.id);

              await tx.patientMedication.update({
                where:{id:duplicate.id},
                data:{
                  medicationId:createData.medicationId,
                  dosage:createData.dosage??null,
                  frequency:createData.frequency??null,
                  route:createData.route??null,
                  indication:createData.indication??null,
                  instructions:createData.instructions??null,
                  prescribedBy:createData.prescribedBy??null,
                  startedAt:createData.startedAt??null,
                  endedAt:createData.endedAt??null,
                  ongoing:createData.ongoing ?? true,
                  adherencePercentage:createData.adherencePercentage,
                  missedDoses:createData.missedDoses,
                  sideEffects:createData.sideEffects??null,
                  effectiveness:createData.effectiveness??null,
                  status:'ACTIVE',
                  notes:createData.notes??null,
                },
              });
            } else {
              throw new ConflictException('This medicine is already in your active medication list.');
            }
          } else {
            await tx.patientMedication.create({data:{healthPassportId,...createData}});
          }
        }
      }
      const idsToDelete=existing.map((item)=>item.id).filter((id)=>!submittedExistingIds.has(id));
      if(idsToDelete.length>0)await tx.patientMedication.deleteMany({where:{healthPassportId,id:{in:idsToDelete}}});
      return tx.patientMedication.findMany({where:{healthPassportId},include:{medication:true},orderBy:{createdAt:'desc'}});
    });
  }

  async updatePatientImmunizations(userId:string,dto:UpdatePatientImmunizationsDto){return this.onboardingRepository.savePatientImmunizations(userId,dto);}
  async updateHealthGoals(userId:string,dto:UpdateHealthGoalsDto){return this.onboardingRepository.saveHealthGoals(userId,dto);}
  async updateHealthJournalSettings(userId:string,dto:UpdateHealthJournalSettingsDto){return this.onboardingRepository.saveHealthJournalSettings(userId,dto);}
  async updateConsent(userId:string,dto:UpdateConsentDto){return this.onboardingRepository.saveConsent(userId,dto);}
  async completeOnboarding(userId:string){return this.onboardingRepository.completeOnboarding(userId);}

  async getDashboardData(userId:string){
    const dashboard=await this.onboardingRepository.getDashboardData(userId);
    const personId=(dashboard.profile as {id?:string}|null)?.id;
    if(!personId)return dashboard;
    const primaryAddress=await this.prisma.personAddress.findFirst({where:{personId,type:'HOME',isPrimary:true},include:{address:{include:{country:true}}}});
    const healthPassportId=(dashboard.healthPassport as {id?:string}|null)?.id;
    const patientImmunizations=healthPassportId?await this.prisma.patientImmunization.findMany({where:{healthPassportId},include:{immunization:true},orderBy:{administeredAt:'desc'}}):[];
    return {...dashboard,profile:{...dashboard.profile,address:primaryAddress?.address??null},immunizations:patientImmunizations};
  }
}
