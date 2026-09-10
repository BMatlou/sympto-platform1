import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';

import { PrismaService } from '../../database/prisma.service';

const SHARE_WINDOW_MINUTES = 10;
const CLINICAL_CONSENT_HOURS = 24;
const PHARMACY_CONSENT_MINUTES = 30;

@Injectable()
export class SmartFileConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async createClinicalShareSession(patientUserId: string) {
    const patient = await this.requirePatient(patientUserId);
    const credentials = await this.createSessionCredentials('sf_');

    return this.prisma.smartFileShareSession.create({
      data: {
        patientId: patient.id,
        qrToken: credentials.qrToken,
        shortCode: credentials.shortCode,
        expiresAt: this.minutesFromNow(SHARE_WINDOW_MINUTES),
      },
      select: { id: true, qrToken: true, shortCode: true, expiresAt: true },
    });
  }

  async createPrescriptionShareSession(patientUserId: string) {
    const patient = await this.requirePatient(patientUserId);
    const credentials = await this.createSessionCredentials('rx_');

    return this.prisma.smartFileShareSession.create({
      data: {
        patientId: patient.id,
        qrToken: credentials.qrToken,
        shortCode: credentials.shortCode,
        expiresAt: this.minutesFromNow(SHARE_WINDOW_MINUTES),
      },
      select: { id: true, qrToken: true, shortCode: true, expiresAt: true },
    });
  }

  async authorizeClinicalShare(practitionerUserId: string, credential: string) {
    const practitioner = await this.requirePractitioner(practitionerUserId);
    const session = await this.consumeSession(credential, 'CLINICAL');

    const consent = await this.grantConsent({
      patientId: session.patientId,
      grantedToUserId: practitioner.userId,
      purpose: 'Clinical Smart File access',
      expiresAt: this.hoursFromNow(CLINICAL_CONSENT_HOURS),
      canViewMedicalRecords: true,
      canViewLabResults: true,
      canViewImaging: true,
      canViewPrescriptions: true,
      canViewAppointments: true,
      canViewAIReports: true,
      canViewHealthPassport: true,
      canViewWearables: true,
      canViewInsurance: false,
      canViewInvoices: false,
    });

    return {
      consentId: consent.id,
      patientId: session.patientId,
      scope: 'CLINICAL_SMART_FILE',
      expiresAt: consent.expiresAt,
    };
  }

  async authorizePrescriptionShare(pharmacistUserId: string, credential: string) {
    const pharmacist = await this.requirePractitioner(pharmacistUserId);

    if (pharmacist.practitionerType !== 'PHARMACIST') {
      throw new ForbiddenException('Only an authenticated pharmacist can redeem a pharmacy prescription share.');
    }

    const session = await this.consumeSession(credential, 'PRESCRIPTION');

    const consent = await this.grantConsent({
      patientId: session.patientId,
      grantedToUserId: pharmacist.userId,
      purpose: 'Prescription access for pharmacy dispensing',
      expiresAt: this.minutesFromNow(PHARMACY_CONSENT_MINUTES),
      canViewMedicalRecords: false,
      canViewLabResults: false,
      canViewImaging: false,
      canViewPrescriptions: true,
      canViewAppointments: false,
      canViewAIReports: false,
      canViewHealthPassport: false,
      canViewWearables: false,
      canViewInsurance: false,
      canViewInvoices: false,
    });

    const prescriptions = await this.getActivePrescriptions(session.patientId);

    return {
      consentId: consent.id,
      patientId: session.patientId,
      scope: 'PRESCRIPTIONS_ONLY',
      expiresAt: consent.expiresAt,
      prescriptions,
    };
  }

  private async requirePatient(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });

    if (!patient) {
      throw new ForbiddenException('Authenticated user is not a patient.');
    }

    return patient;
  }

  private async requirePractitioner(userId: string) {
    const practitioner = await this.prisma.practitioner.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        practitionerType: true,
        status: true,
        verified: true,
      },
    });

    if (!practitioner) {
      throw new ForbiddenException('Authenticated user is not a practitioner.');
    }

    if (practitioner.status !== 'ACTIVE' || !practitioner.verified) {
      throw new ForbiddenException('Practitioner is not verified and active.');
    }

    return practitioner;
  }

  private async consumeSession(
    credential: string,
    expectedScope: 'CLINICAL' | 'PRESCRIPTION',
  ) {
    const normalized = credential.trim();
    const isQrToken = normalized.startsWith('sf_') || normalized.startsWith('rx_');
    const isShortCode = /^\d{6}$/.test(normalized);

    if (!isQrToken && !isShortCode) {
      throw new BadRequestException('Invalid Smart File share code.');
    }

    if (isQrToken) {
      const tokenScope = normalized.startsWith('rx_') ? 'PRESCRIPTION' : 'CLINICAL';
      if (tokenScope !== expectedScope) {
        throw new ForbiddenException('This Smart File QR code is for a different purpose.');
      }
    }

    if (isShortCode) {
      const firstDigit = Number(normalized[0]);
      const codeScope = firstDigit >= 7 ? 'PRESCRIPTION' : 'CLINICAL';
      if (codeScope !== expectedScope) {
        throw new ForbiddenException('This Smart File code is for a different purpose.');
      }
    }

    const session = await this.prisma.smartFileShareSession.findFirst({
      where: isQrToken ? { qrToken: normalized } : { shortCode: normalized },
    });

    if (!session) {
      throw new NotFoundException('Smart File share session not found or already used.');
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.smartFileShareSession.delete({ where: { id: session.id } });
      throw new BadRequestException('Smart File share session has expired.');
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.smartFileShareSession.deleteMany({
        where: { id: session.id, expiresAt: { gt: new Date() } },
      });

      if (deleted.count !== 1) {
        throw new BadRequestException('Smart File share session has already been used or expired.');
      }

      return session;
    });
  }

  private async grantConsent(data: {
    patientId: string;
    grantedToUserId: string;
    purpose: string;
    expiresAt: Date;
    canViewMedicalRecords: boolean;
    canViewLabResults: boolean;
    canViewImaging: boolean;
    canViewPrescriptions: boolean;
    canViewAppointments: boolean;
    canViewAIReports: boolean;
    canViewHealthPassport: boolean;
    canViewWearables: boolean;
    canViewInsurance: boolean;
    canViewInvoices: boolean;
  }) {
    // Create a new consent record for every explicit share. This prevents a
    // clinical or pharmacy share from overwriting an unrelated financial consent.
    return this.prisma.dataAccessConsent.create({ data });
  }

  private async getActivePrescriptions(patientId: string) {
    const now = new Date();

    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        items: {
          include: {
            medication: {
              select: { id: true, name: true, genericName: true, brandName: true },
            },
          },
        },
        practitioner: {
          select: {
            registrationNumber: true,
            person: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return prescriptions.map((prescription) => ({
      id: prescription.id,
      issuedAt: prescription.issuedAt,
      expiresAt: prescription.expiresAt,
      notes: prescription.notes,
      practitioner: {
        name: `${prescription.practitioner.person.firstName} ${prescription.practitioner.person.lastName}`,
        registrationNumber: prescription.practitioner.registrationNumber,
      },
      medications: prescription.items.map((item) => ({
        medicationId: item.medication.id,
        medication: item.medication.name,
        genericName: item.medication.genericName,
        brandName: item.medication.brandName,
        dosage: item.dosage,
        frequency: item.frequency,
        route: item.route,
        durationDays: item.durationDays,
        quantity: item.quantity?.toString() ?? null,
        refills: item.refills,
        instructions: item.instructions,
      })),
    }));
  }

  private async createSessionCredentials(prefix: 'sf_' | 'rx_') {
    for (;;) {
      const qrToken = `${prefix}${randomBytes(32).toString('hex')}`;
      const shortCode = this.generateShortCode(prefix);

      const existing = await this.prisma.smartFileShareSession.findFirst({
        where: { OR: [{ qrToken }, { shortCode }] },
        select: { id: true },
      });

      if (!existing) return { qrToken, shortCode };
    }
  }

  private generateShortCode(prefix: 'sf_' | 'rx_') {
    const firstDigit = prefix === 'rx_' ? randomInt(7, 10) : randomInt(1, 7);
    return `${firstDigit}${randomInt(0, 100000).toString().padStart(5, '0')}`;
  }

  private minutesFromNow(minutes: number) {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private hoursFromNow(hours: number) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
}
