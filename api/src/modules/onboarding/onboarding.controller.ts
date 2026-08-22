import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { OnboardingService } from './onboarding.service';

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


@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
  ) {}

/**
 * Get onboarding progress.
 * Creates a progress record automatically
 * if one does not already exist.
 */
@Get('progress')
async getProgress(
  @Req() req: any,
) {
  return this.onboardingService.getProgress(
    req.user.sub,
  );
}

  /**
   * Update onboarding progress
   */
  @Patch('progress')
  async updateProgress(
    @Req() req: any,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.onboardingService.updateProgress(
      req.user.sub,
      dto,
    );
  }

  /**
   * STEP 1
   * Personal Profile
   */
  @Patch('profile')
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.onboardingService.updateProfile(
      req.user.sub,
      dto,
    );
  }

  /**
   * STEP 2
   * Health Profile
   */
  @Patch('individual/profile')
  async updateIndividualProfile(
    @Req() req: any,
    @Body()
    dto: UpdateIndividualProfileDto,
  ) {
    return this.onboardingService.updateIndividualProfile(
      req.user.sub,
      dto,
    );
  }

  /**
   * STEP 3
   * Emergency Contact
   */
  @Patch('individual/emergency-contact')
  async updateEmergencyContact(
    @Req() req: any,
    @Body()
    dto: UpdateEmergencyContactDto,
  ) {
    return this.onboardingService.updateEmergencyContact(
      req.user.sub,
      dto,
    );
  }

    /**
   * STEP 4
   * Patient Allergies
   */
  @Patch('individual/allergies')
  async updatePatientAllergies(
    @Req() req: any,
    @Body()
    dto: UpdatePatientAllergiesDto,
  ) {
    return this.onboardingService.updatePatientAllergies(
      req.user.sub,
      dto,
    );
  }

  /**
 * STEP 5
 * Patient Medical Conditions
 */
@Patch('individual/conditions')
async updatePatientConditions(
  @Req() req: any,
  @Body()
  dto: UpdatePatientConditionsDto,
) {
  return this.onboardingService.updatePatientConditions(
    req.user.sub,
    dto,
  );
}

/**
 * STEP 6
 * Patient Medications
 */
@Patch('individual/medications')
async updatePatientMedications(
  @Req() req: any,
  @Body()
  dto: UpdatePatientMedicationsDto,
) {
  return this.onboardingService.updatePatientMedications(
    req.user.sub,
    dto,
  );
}

/**
 * STEP 7
 * Patient Immunizations
 */
@Patch('individual/immunizations')
async updatePatientImmunizations(
  @Req() req: any,
  @Body()
  dto: UpdatePatientImmunizationsDto,
) {
  return this.onboardingService.updatePatientImmunizations(
    req.user.sub,
    dto,
  );
}

  /**
   * STEP 8
   * Health Goals
   */
  @Patch(
    'individual/health-goals',
  )
  async updateHealthGoals(
    @Req() req: any,
    @Body()
    dto: UpdateHealthGoalsDto,
  ) {
    return this.onboardingService.updateHealthGoals(
      req.user.sub,
      dto,
    );
  }

    /**
   * STEP 9
   * Health Journal Settings
   */
  @Patch(
    'individual/journal-settings',
  )
  async updateHealthJournalSettings(
    @Req() req: any,
    @Body()
    dto: UpdateHealthJournalSettingsDto,
  ) {
    return this.onboardingService.updateHealthJournalSettings(
      req.user.sub,
      dto,
    );
  }

    /**
   * STEP 10
   * Save onboarding consent
   */
  @Patch(
    'individual/consent',
  )
  async updateConsent(
    @Req() req: any,
    @Body()
    dto: UpdateConsentDto,
  ) {
    return this.onboardingService.updateConsent(
      req.user.sub,
      dto,
    );
  }

    /**
   * STEP 11
   * Complete onboarding
   */

    @Post('complete')
  async completeOnboarding(
    @Req() req: any,
  ) {
    return this.onboardingService.completeOnboarding(
      req.user.sub,
    );
  }

  @Get('dashboard')
  async getDashboardData(
    @Req() req: any,
  ) {
    return this.onboardingService.getDashboardData(
      req.user.sub,
    );
  }
}