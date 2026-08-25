import { BadRequestException, Injectable } from '@nestjs/common';

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

@Injectable()
export class OnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getProgress(userId: string) {
    let progress = await this.onboardingRepository.findByUser(userId);
    if (!progress) progress = await this.onboardingRepository.create(userId);
    return progress;
  }

  async updateProgress(userId: string, dto: UpdateProgressDto) {
    return this.onboardingRepository.update(userId, {
      currentStep: dto.currentStep,
      completionPercentage: dto.completionPercentage,
      status: dto.status,
      completedAt: dto.status === 'COMPLETED' ? new Date() : null,
    });
  }

  private hasAddressUpdate(dto: UpdateProfileDto) {
    return [
      dto.addressLine1,
      dto.addressLine2,
      dto.suburb,
      dto.city,
      dto.province,
      dto.postalCode,
      dto.country,
    ].some((value) => value !== undefined);
  }

  private async updatePrimaryAddress(userId: string, dto: UpdateProfileDto) {
    if (!this.hasAddressUpdate(dto)) return;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { personId: true },
      });

      if (!user) {
        throw new BadRequestException('User not found.');
      }

      let countryId: string | null | undefined;
      if (dto.country !== undefined) {
        const normalizedCountry = dto.country.trim().toUpperCase();

        if (!normalizedCountry) {
          countryId = null;
        } else {
          let country = await tx.country.findUnique({
            where: { iso2: normalizedCountry },
            select: { id: true },
          });

          if (!country && normalizedCountry === 'ZA') {
            country = await tx.country.upsert({
              where: { iso2: 'ZA' },
              update: {
                iso3: 'ZAF',
                numericCode: '710',
                name: 'South Africa',
                officialName: 'Republic of South Africa',
                phoneCode: '+27',
                searchable: true,
                active: true,
              },
              create: {
                iso2: 'ZA',
                iso3: 'ZAF',
                numericCode: '710',
                name: 'South Africa',
                officialName: 'Republic of South Africa',
                phoneCode: '+27',
                searchable: true,
                active: true,
              },
              select: { id: true },
            });
          }

          if (!country) {
            throw new BadRequestException(
              `Selected country could not be found for ISO-2 code ${normalizedCountry}.`,
            );
          }

          countryId = country.id;
        }
      }

      const primary = await tx.personAddress.findFirst({
        where: {
          personId: user.personId,
          type: 'HOME',
          isPrimary: true,
        },
        include: { address: true },
      });

      if (primary) {
        await tx.address.update({
          where: { id: primary.addressId },
          data: {
            line1: dto.addressLine1 ?? primary.address.line1,
            line2: dto.addressLine2 !== undefined ? dto.addressLine2 : primary.address.line2,
            suburb: dto.suburb !== undefined ? dto.suburb : primary.address.suburb,
            city: dto.city ?? primary.address.city,
            province: dto.province !== undefined ? dto.province : primary.address.province,
            postalCode: dto.postalCode !== undefined ? dto.postalCode : primary.address.postalCode,
            countryId,
          },
        });
      } else {
        const address = await tx.address.create({
          data: {
            line1: dto.addressLine1 ?? '',
            line2: dto.addressLine2 ?? null,
            suburb: dto.suburb ?? null,
            city: dto.city ?? '',
            province: dto.province ?? null,
            postalCode: dto.postalCode ?? null,
            countryId: countryId ?? null,
          },
        });

        await tx.personAddress.create({
          data: {
            personId: user.personId,
            addressId: address.id,
            type: 'HOME',
            isPrimary: true,
          },
        });
      }
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const hasOnboardingProfileFields =
      dto.preferredName !== undefined ||
      dto.dateOfBirth !== undefined ||
      dto.gender !== undefined;

    const profile = await this.onboardingRepository.updatePersonProfile(userId, dto);
    await this.updatePrimaryAddress(userId, dto);

    if (!hasOnboardingProfileFields) {
      return profile;
    }

    // Editing an already completed profile must never reopen onboarding.
    const progress = await this.onboardingRepository.findByUser(userId);
    if (progress?.status === 'COMPLETED') {
      return profile;
    }

    return this.onboardingRepository.update(userId, {
      currentStep: 2,
      completionPercentage: 10,
      status: 'IN_PROGRESS',
    });
  }

  async updateIndividualProfile(userId: string, dto: UpdateIndividualProfileDto) {
    return this.onboardingRepository.updateIndividualProfile(userId, dto);
  }

  async updateEmergencyContact(userId: string, dto: UpdateEmergencyContactDto) {
    return this.onboardingRepository.saveEmergencyContact(userId, dto);
  }

  async updatePatientAllergies(userId: string, dto: UpdatePatientAllergiesDto) {
    return this.onboardingRepository.savePatientAllergies(userId, dto);
  }

  async updatePatientConditions(userId: string, dto: UpdatePatientConditionsDto) {
    return this.onboardingRepository.savePatientConditions(userId, dto);
  }

  async updatePatientMedications(userId: string, dto: UpdatePatientMedicationsDto) {
    return this.onboardingRepository.savePatientMedications(userId, dto);
  }

  async updatePatientImmunizations(userId: string, dto: UpdatePatientImmunizationsDto) {
    return this.onboardingRepository.savePatientImmunizations(userId, dto);
  }

  async updateHealthGoals(userId: string, dto: UpdateHealthGoalsDto) {
    return this.onboardingRepository.saveHealthGoals(userId, dto);
  }

  async updateHealthJournalSettings(userId: string, dto: UpdateHealthJournalSettingsDto) {
    return this.onboardingRepository.saveHealthJournalSettings(userId, dto);
  }

  async updateConsent(userId: string, dto: UpdateConsentDto) {
    return this.onboardingRepository.saveConsent(userId, dto);
  }

  async completeOnboarding(userId: string) {
    return this.onboardingRepository.completeOnboarding(userId);
  }

  async getDashboardData(userId: string) {
    const dashboard = await this.onboardingRepository.getDashboardData(userId);

    const personId = (dashboard.profile as { id?: string } | null)?.id;
    if (!personId) return dashboard;

    const primaryAddress = await this.prisma.personAddress.findFirst({
      where: {
        personId,
        type: 'HOME',
        isPrimary: true,
      },
      include: {
        address: {
          include: { country: true },
        },
      },
    });

    return {
      ...dashboard,
      profile: {
        ...dashboard.profile,
        address: primaryAddress?.address ?? null,
      },
    };
  }
}
