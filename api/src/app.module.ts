import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { PatientsModule } from './modules/patients/patients.module';
import { FamilyModule } from './modules/family/family.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { EncountersModule } from './modules/encounters/encounters.module';
import { ClinicalVitalsModule } from './modules/clinical-vitals/clinical-vitals.module';
import { PatientDiagnosesModule } from './modules/patient-diagnoses/patient-diagnoses.module';
import { PatientProceduresModule } from './modules/patient-procedures/patient-procedures.module';
import { ClinicalNotesModule } from './modules/clinical-notes/clinical-notes.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { PrescriptionItemsModule } from './modules/prescription-items/prescription-items.module';
import { LabOrdersModule } from './modules/lab-orders/lab-orders.module';
import { LabOrderItemsModule } from './modules/lab-order-items/lab-order-items.module';
import { SpecimensModule } from './modules/specimens/specimens.module';
import { SpecimenCollectionsModule } from './modules/specimen-collections/specimen-collections.module';
import { SpecimenRejectionsModule } from './modules/specimen-rejections/specimen-rejections.module';
import { LabResultsModule } from './modules/lab-results/lab-results.module';
import { LabResultItemsModule } from './modules/lab-result-items/lab-result-items.module';
import { ResultAttachmentsModule } from './modules/result-attachments/result-attachments.module';
import { ResultVerificationsModule } from './modules/result-verifications/result-verifications.module';
import { ResultAmendmentsModule } from './modules/result-amendments/result-amendments.module';
import { CriticalResultsModule } from './modules/critical-results/critical-results.module';
import { LabDisciplinesModule } from './modules/lab-disciplines/lab-disciplines.module';
import { LabCategoriesModule } from './modules/lab-categories/lab-categories.module';
import { LabMethodsModule } from './modules/lab-methods/lab-methods.module';
import { LabUnitsModule } from './modules/lab-units/lab-units.module';
import { LabPanelsModule } from './modules/lab-panels/lab-panels.module';
import { LabTestsModule } from './modules/lab-tests/lab-tests.module';
import { LabPanelItemsModule } from './modules/lab-panel-items/lab-panel-items.module';
import { LaboratoriesModule } from './modules/laboratories/laboratories.module';
import { LaboratoryInstrumentsModule } from './modules/laboratory-instruments/laboratory-instruments.module';
import { LabCalibrationsModule } from './modules/lab-calibrations/lab-calibrations.module';
import { LabQualityControlsModule } from './modules/lab-quality-controls/lab-quality-controls.module';
import { LabAuditsModule } from './modules/lab-audits/lab-audits.module';
import { ImagingCentersModule } from './modules/imaging-centers/imaging-centers.module';
import { ImagingDevicesModule } from './modules/imaging-devices/imaging-devices.module';
import { ImagingProceduresModule } from './modules/imaging-procedures/imaging-procedures.module';
import { ImagingOrdersModule } from './modules/imaging-orders/imaging-orders.module';
import { ImagingOrderItemsModule } from './modules/imaging-order-items/imaging-order-items.module';
import { ImagingStudiesModule } from './modules/imaging-studies/imaging-studies.module';
import { ImagingSeriesModule } from './modules/imaging-series/imaging-series.module';
import { ImagingImagesModule } from './modules/imaging-images/imaging-images.module';
import { ImagingReportsModule } from './modules/imaging-reports/imaging-reports.module';
import { InvoiceItemsModule } from './modules/invoice-items/invoice-items.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { PaymentAllocationsModule } from './modules/payment-allocations/payment-allocations.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { ClaimPaymentsModule } from './modules/claim-payments/claim-payments.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { FinancialAdjustmentsModule } from './modules/financial-adjustments/financial-adjustments.module';
import { PriceListsModule } from './modules/price-lists/price-lists.module';
import { PriceListItemsModule } from './modules/price-list-items/price-list-items.module';
import { CarePlansModule } from './modules/care-plans/care-plans.module';
import { CarePlanGoalsModule } from './modules/care-plan-goals/care-plan-goals.module';
import { CarePlanTasksModule } from './modules/care-plan-tasks/care-plan-tasks.module';
import { CarePlanNotesModule } from './modules/care-plan-notes/care-plan-notes.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ReferralDocumentsModule } from './modules/referral-documents/referral-documents.module';
import { ReferralNotesModule } from './modules/referral-notes/referral-notes.module';
import { ReferralStatusHistoryModule } from './modules/referral-status-history/referral-status-history.module';
import { ReferralFeedbackModule } from './modules/referral-feedback/referral-feedback.module';
import { ClinicalDecisionSupportModule } from './modules/clinical-decision-support/clinical-decision-support.module';
import { CdsActionsModule } from './modules/cds-actions/cds-actions.module';
import { CdsAlertsModule } from './modules/cds-alerts/cds-alerts.module';
import { CdsRulesModule } from './modules/cds-rules/cds-rules.module';
import { CdsRuleExecutionsModule } from './modules/cds-rule-executions/cds-rule-executions.module';
import { CdsOverridesModule } from './modules/cds-overrides/cds-overrides.module';
import { PublicHealthReportsModule } from './modules/public-health-reports/public-health-reports.module';
import { PublicHealthSubmissionsModule } from './modules/public-health-submissions/public-health-submissions.module';
import { PublicHealthAttachmentsModule } from './modules/public-health-attachments/public-health-attachments.module';
import { DiseaseRegistriesModule } from './modules/disease-registries/disease-registries.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { PractitionerOrganizationsModule } from './modules/practitioner-organizations/practitioner-organizations.module';
import { CountriesModule } from './modules/countries/countries.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { PersonsModule } from './modules/persons/persons.module';
import { PersonAddressesModule } from './modules/person-addresses/person-addresses.module';
import { PractitionersModule } from './modules/practitioners/practitioners.module';
import { EmergencyContactsModule } from './modules/emergency-contacts/emergency-contacts.module';
import { IdentityDocumentsModule } from './modules/identity-documents/identity-documents.module';
import { VerificationRequestsModule } from './modules/verification-requests/verification-requests.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { PractitionerSpecialtiesModule } from './modules/practitioner-specialties/practitioner-specialties.module';
import { QualificationsModule } from './modules/qualifications/qualifications.module';
import { PractitionerQualificationsModule } from './modules/practitioner-qualifications/practitioner-qualifications.module';
import { PracticesModule } from './modules/practices/practices.module';
import { PracticeLocationsModule } from './modules/practice-locations/practice-locations.module';
import { HealthPassportsModule } from './modules/health-passports/health-passports.module';
import { AllergiesModule } from './modules/allergies/allergies.module';
import { PatientAllergiesModule } from './modules/patient-allergies/patient-allergies.module';
import { ConditionsModule } from './modules/conditions/conditions.module';
import { PatientConditionsModule } from './modules/patient-conditions/patient-conditions.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { PatientMedicationsModule } from './modules/patient-medications/patient-medications.module';
import { ImmunizationsModule } from './modules/immunizations/immunizations.module';
import { PatientImmunizationsModule } from './modules/patient-immunizations/patient-immunizations.module';
import { EncounterTypesModule } from './modules/encounter-types/encounter-types.module';
import { VitalTypesModule } from './modules/vital-types/vital-types.module';
import { DiagnosesModule } from './modules/diagnoses/diagnoses.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AppointmentParticipantsModule } from './modules/appointment-participants/appointment-participants.module';
import { PractitionerAvailabilityModule } from './modules/practitioner-availability/practitioner-availability.module';
import { AppointmentSlotsModule } from './modules/appointment-slots/appointment-slots.module';
import { AppointmentRemindersModule } from './modules/appointment-reminders/appointment-reminders.module';
import { PharmaciesModule } from './modules/pharmacies/pharmacies.module';
import { DispensationsModule } from './modules/dispensations/dispensations.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { InvoiceHistoryModule } from './modules/invoice-history/invoice-history.module';
import { CreditNotesModule } from './modules/credit-notes/credit-notes.module';
import { DebitNotesModule } from './modules/debit-notes/debit-notes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BillingModule } from './modules/billing/billing.module';
import { InsuranceProvidersModule } from './modules/insurance-providers/insurance-providers.module';
import { InsurancePoliciesModule } from './modules/insurance-policies/insurance-policies.module';
import { PatientInsuranceModule } from './modules/patient-insurance/patient-insurance.module';
import { InsuranceBenefitsModule } from './modules/insurance-benefits/insurance-benefits.module';
import { InsuranceAuthorizationsModule } from './modules/insurance-authorizations/insurance-authorizations.module';
import { ClaimDocumentsModule } from './modules/claim-documents/claim-documents.module';
import { ClaimStatusHistoryModule } from './modules/claim-status-history/claim-status-history.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotificationDeliveriesModule } from './modules/notification-deliveries/notification-deliveries.module';
import { NotificationPreferencesModule } from './modules/notification-preferences/notification-preferences.module';
import { NotificationTemplatesModule } from './modules/notification-templates/notification-templates.module';
import { NotificationQueueModule } from './modules/notification-queue/notification-queue.module';
import { DeviceTokensModule } from './modules/device-tokens/device-tokens.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { OrganizationMembersModule } from './modules/organization-members/organization-members.module';
import { TenantSettingsModule } from './modules/tenant-settings/tenant-settings.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { TelemedicineSessionsModule } from './modules/telemedicine-sessions/telemedicine-sessions.module';
import { TelemedicineParticipantsModule } from './modules/telemedicine-participants/telemedicine-participants.module';
import { TelemedicineEventsModule } from './modules/telemedicine-events/telemedicine-events.module';
import { TelemedicineChatsModule } from './modules/telemedicine-chats/telemedicine-chats.module';
import { TelemedicineConsentsModule } from './modules/telemedicine-consents/telemedicine-consents.module';
import { AIAnalysesModule } from './modules/ai-analyses/ai-analyses.module';
import { AISymptomAssessmentsModule } from './modules/ai-symptom-assessments/ai-symptom-assessments.module';
import { AISymptomsModule } from './modules/ai-symptoms/ai-symptoms.module';
import { AIQuestionsModule } from './modules/ai-questions/ai-questions.module';
import { AIDifferentialDiagnosesModule } from './modules/ai-differential-diagnoses/ai-differential-diagnoses.module';
import { AIRecommendationsModule } from './modules/ai-recommendations/ai-recommendations.module';
import { AIClinicalReviewsModule } from './modules/ai-clinical-reviews/ai-clinical-reviews.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuditEventsModule } from './modules/audit-events/audit-events.module';
import { AccessLogsModule } from './modules/access-logs/access-logs.module';
import { SecurityIncidentsModule } from './modules/security-incidents/security-incidents.module';
import { ComplianceIssuesModule } from './modules/compliance-issues/compliance-issues.module';
import { DataAccessConsentsModule } from './modules/data-access-consents/data-access-consents.module';
import { WearableDevicesModule } from './modules/wearable-devices/wearable-devices.module';
import { DeviceMeasurementsModule } from './modules/device-measurements/device-measurements.module';
import { DeviceAlertsModule } from './modules/device-alerts/device-alerts.module';
import { DeviceSyncLogsModule } from './modules/device-sync-logs/device-sync-logs.module';
import { ReferenceRangesModule } from './modules/reference-ranges/reference-ranges.module';
import { SpecimenTypesModule } from './modules/specimen-types/specimen-types.module';
import { SpecimenContainersModule } from './modules/specimen-containers/specimen-containers.module';
import { ClinicalEpisodesModule } from './modules/clinical-episodes/clinical-episodes.module';
import { SymptomLogsModule } from './modules/symptom-logs/symptom-logs.module';
import { SymptomLogItemsModule } from './modules/symptom-log-items/symptom-log-items.module';
import { HealthJournalsModule } from './modules/health-journals/health-journals.module';
import { SymptomTriggersModule } from './modules/symptom-triggers/symptom-triggers.module';
import { MedicationEffectsModule } from './modules/medication-effects/medication-effects.module';
import { AIObservationsModule } from './modules/ai-observations/ai-observations.module';
import { ClinicalEpisodeAttachmentsModule } from './modules/clinical-episode-attachments/clinical-episode-attachments.module';
import { SymptomLogAttachmentsModule } from './modules/symptom-log-attachments/symptom-log-attachments.module';
import { HealthGoalsModule } from './modules/health-goals/health-goals.module';
import { HealthGoalProgressModule } from './modules/health-goal-progress/health-goal-progress.module';
import { RiskAssessmentsModule } from './modules/risk-assessments/risk-assessments.module';
import { RiskAssessmentResultsModule } from './modules/risk-assessment-results/risk-assessment-results.module';
import { PatientBaselinesModule } from './modules/patient-baselines/patient-baselines.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
    AdminModule,
    PatientsModule,
    FamilyModule,
    MedicalRecordsModule,
    EncountersModule,
    ClinicalVitalsModule,
    PatientDiagnosesModule,
    PatientProceduresModule,
    ClinicalNotesModule,
    AttachmentsModule,
    PrescriptionsModule,
    PrescriptionItemsModule,
    LabOrdersModule,
    LabOrderItemsModule,
    SpecimensModule,
    SpecimenCollectionsModule,
    SpecimenRejectionsModule,
    LabResultsModule,
    LabResultItemsModule,
    ResultAttachmentsModule,
    ResultVerificationsModule,
    ResultAmendmentsModule,
    CriticalResultsModule,
    LabDisciplinesModule,
    LabCategoriesModule,
    LabMethodsModule,
    LabUnitsModule,
    LabPanelsModule,
    LabTestsModule,
    LabPanelItemsModule,
    LaboratoriesModule,
    LaboratoryInstrumentsModule,
    LabCalibrationsModule,
    LabQualityControlsModule,
    LabAuditsModule,
    ImagingCentersModule,
    ImagingDevicesModule,
    ImagingProceduresModule,
    ImagingOrdersModule,
    ImagingOrderItemsModule,
    ImagingStudiesModule,
    ImagingSeriesModule,
    ImagingImagesModule,
    ImagingReportsModule,
    InvoiceItemsModule,
    ReceiptsModule,
    PaymentAllocationsModule,
    ClaimsModule,
    ClaimPaymentsModule,
    RefundsModule,
    FinancialAdjustmentsModule,
    PriceListsModule,
    PriceListItemsModule,
    CarePlansModule,
    CarePlanGoalsModule,
    CarePlanTasksModule,
    CarePlanNotesModule,
    ReferralsModule,
    ReferralDocumentsModule,
    ReferralNotesModule,
    ReferralStatusHistoryModule,
    ReferralFeedbackModule,
    ClinicalDecisionSupportModule,
    CdsActionsModule,
    CdsAlertsModule,
    CdsRulesModule,
    CdsRuleExecutionsModule,
    CdsOverridesModule,
    PublicHealthReportsModule,
    PublicHealthSubmissionsModule,
    PublicHealthAttachmentsModule,
    DiseaseRegistriesModule,
    ConsentsModule,
    PractitionerOrganizationsModule,
    CountriesModule,
    AddressesModule,
    PersonsModule,
    PersonAddressesModule,
    PractitionersModule,
    EmergencyContactsModule,
    IdentityDocumentsModule,
    VerificationRequestsModule,
    SpecialtiesModule,
    PractitionerSpecialtiesModule,
    QualificationsModule,
    PractitionerQualificationsModule,
    PracticesModule,
    PracticeLocationsModule,
    HealthPassportsModule,
    AllergiesModule,
    PatientAllergiesModule,
    ConditionsModule,
    PatientConditionsModule,
    MedicationsModule,
    PatientMedicationsModule,
    ImmunizationsModule,
    PatientImmunizationsModule,
    EncounterTypesModule,
    VitalTypesModule,
    DiagnosesModule,
    ProceduresModule,
    AppointmentsModule,
    AppointmentParticipantsModule,
    PractitionerAvailabilityModule,
    AppointmentSlotsModule,
    AppointmentRemindersModule,
    PharmaciesModule,
    DispensationsModule,
    InvoicesModule,
    InvoiceHistoryModule,
    CreditNotesModule,
    DebitNotesModule,
    PaymentsModule,
    BillingModule,
    InsuranceProvidersModule,
    InsurancePoliciesModule,
    PatientInsuranceModule,
    InsuranceBenefitsModule,
    InsuranceAuthorizationsModule,
    ClaimDocumentsModule,
    ClaimStatusHistoryModule,
    ConversationsModule,
    MessagesModule,
    NotificationsModule,
    NotificationDeliveriesModule,
    NotificationPreferencesModule,
    NotificationTemplatesModule,
    NotificationQueueModule,
    DeviceTokensModule,
    OrganizationsModule,
    BranchesModule,
    DepartmentsModule,
    OrganizationMembersModule,
    TenantSettingsModule,
    ApiKeysModule,
    TelemedicineSessionsModule,
    TelemedicineParticipantsModule,
    TelemedicineEventsModule,
    TelemedicineChatsModule,
    TelemedicineConsentsModule,
    AIAnalysesModule,
    AISymptomAssessmentsModule,
    AISymptomsModule,
    AIQuestionsModule,
    AIDifferentialDiagnosesModule,
    AIRecommendationsModule,
    AIClinicalReviewsModule,
    AuditLogsModule,
    AuditEventsModule,
    AccessLogsModule,
    SecurityIncidentsModule,
    ComplianceIssuesModule,
    DataAccessConsentsModule,
    WearableDevicesModule,
    DeviceMeasurementsModule,
    DeviceAlertsModule,
    DeviceSyncLogsModule,
    ReferenceRangesModule,
    SpecimenTypesModule,
    SpecimenContainersModule,
    ClinicalEpisodesModule,
    SymptomLogsModule,
    SymptomLogItemsModule,
    HealthJournalsModule,
    SymptomTriggersModule,
    MedicationEffectsModule,
    AIObservationsModule,
    ClinicalEpisodeAttachmentsModule,
    SymptomLogAttachmentsModule,
    HealthGoalsModule,
    HealthGoalProgressModule,
    RiskAssessmentsModule,
    RiskAssessmentResultsModule,
    PatientBaselinesModule,
    OnboardingModule,
    
  ],
})
export class AppModule {}