  async saveConsent(userId: string, dto: UpdateConsentDto) {
    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({ where: { userId } });
      if (!patient) throw new NotFoundException('Patient not found.');

      const consents = [
        { type: 'TERMS', granted: dto.acceptTerms, purpose: 'Terms and conditions' },
        { type: 'PRIVACY_POLICY', granted: dto.acceptPrivacyPolicy, purpose: 'Privacy policy' },
        { type: 'DATA_PROCESSING', granted: dto.acceptDataProcessing, purpose: 'Health data processing' },
        { type: 'MARKETING', granted: dto.acceptMarketing ?? false, purpose: 'Marketing communications' },
      ];

      for (const consent of consents) {
        const existing = await tx.consent.findFirst({
          where: { patientId: patient.id, type: consent.type },
        });

        const now = new Date();
        const data = {
          granted: consent.granted,
          purpose: consent.purpose,
          ...(consent.granted
            ? { grantedAt: existing?.grantedAt ?? now, revokedAt: null }
            : { revokedAt: now }),
        };

        if (existing) {
          await tx.consent.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await tx.consent.create({
            data: {
              patientId: patient.id,
              type: consent.type,
              granted: consent.granted,
              purpose: consent.purpose,
              grantedAt: now,
              revokedAt: consent.granted ? null : now,
            },
          });
        }
      }

      return this.updateOnboardingStep(tx, userId, 11, 100);
    });
  }

  async completeOnboarding(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const progress = await tx.onboardingProgress.findUnique({ where: { userId } });
      if (!progress) throw new NotFoundException('Onboarding progress not found.');
      return tx.onboardingProgress.update({
        where: { userId },
        data: {