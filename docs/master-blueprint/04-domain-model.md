# Sympto Master Blueprint

# Document 04 – Domain Model

| Field          | Value        |
| -------------- | ------------ |
| Project        | Sympto       |
| Document       | Domain Model |
| Version        | 1.0          |
| Status         | Draft        |
| Classification | Internal     |
| Last Updated   | July 2026    |

---

# 1. Introduction

The Domain Model defines the core business domains and entities that make up the Sympto platform.

Each entity represents a real-world concept used by patients, practitioners, healthcare organisations, wearable devices, artificial intelligence services, or system administrators.

The purpose of this document is to establish a shared language across product, engineering, AI, design and healthcare stakeholders before implementation begins.

---

# 2. Domain Principles

Every domain shall:

* Have a clear business purpose.
* Own its own data.
* Expose functionality through APIs.
* Be independently testable.
* Support auditing where applicable.
* Support future expansion.

---

# 3. Domain Catalogue

The Sympto platform is organised into the following business domains.

| Domain                  | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| Identity & Access       | Authentication, users, roles, permissions and verification |
| Patient Management      | Patient profiles, family members and preferences           |
| Practitioner Management | Healthcare practitioners and organisations                 |
| Medical Records         | Clinical history, diagnoses and treatments                 |
| Lifestyle & Wellness    | Daily habits and wellness tracking                         |
| Wearables               | Connected devices and synchronisation                      |
| Vitals & Measurements   | Clinical and wearable measurements                         |
| Symptoms                | Symptom logging and assessments                            |
| Documents               | Secure storage of medical records                          |
| AI Intelligence         | Health scoring and recommendations                         |
| Appointments            | Booking and consultation management                        |
| Messaging               | Secure patient–practitioner communication                  |
| Notifications           | Alerts and reminders                                       |
| Location Intelligence   | Nearby healthcare services and travel mode                 |
| Pharmacy                | Electronic prescriptions and medication fulfilment         |
| Laboratory              | Laboratory orders and results                              |
| Emergency Services      | SOS, emergency profile and emergency contacts              |
| Consent                 | Health data sharing permissions                            |
| Research                | Research participation and anonymised datasets             |
| Reporting & Analytics   | Dashboards and reporting                                   |
| Audit & Compliance      | Audit trails and compliance records                        |
| Administration          | Platform management and configuration                      |

---

# 4. Identity & Access Domain

Purpose:

Manage authentication, authorisation and identity verification.

Core Entities:

* User
* UserProfile
* UserSettings
* Role
* Permission
* UserRole
* Session
* RefreshToken
* Device
* LoginHistory
* MFAConfiguration
* IdentityVerification
* IdentityDocument
* Passport
* NationalID
* Address
* Country
* Language

---

# 5. Patient Management Domain

Purpose:

Manage patient-specific information.

Core Entities:

* Patient
* PatientProfile
* EmergencyContact
* Insurance
* MedicalAid
* FamilyMember
* CaregiverRelationship
* HealthPassport
* PatientPreference

---

# 6. Practitioner Management Domain

Purpose:

Manage healthcare professionals and organisations.

Core Entities:

* Practitioner
* PractitionerProfile
* PractitionerLicence
* PractitionerRegistration
* PractitionerSpecialty
* HealthcareOrganisation
* OrganisationMembership
* Clinic
* Department
* ConsultationRoom

---

# 7. Medical Records Domain

Purpose:

Store lifelong clinical records.

Core Entities:

* MedicalHistory
* MedicalCondition
* Diagnosis
* Allergy
* Medication
* MedicationSchedule
* Prescription
* PrescriptionItem
* Vaccination
* SurgicalHistory
* HospitalAdmission
* Referral
* SickLeaveCertificate
* ClinicalNote

---

# 8. Lifestyle & Wellness Domain

Purpose:

Track behaviours that influence health.

Core Entities:

* LifestyleProfile
* SmokingRecord
* AlcoholConsumption
* WaterIntake
* NutritionLog
* Meal
* ExerciseSession
* ExerciseType
* SleepSession
* MoodLog
* StressLog
* Goal
* GoalProgress

---

# 9. Wearables Domain

Purpose:

Connect health devices.

Supported Platforms:

* Apple Health
* Android Health Connect
* Garmin
* Fitbit
* Samsung Health
* Huawei Health
* Oura
* Sympto Watch

Core Entities:

* WearableDevice
* DeviceConnection
* DeviceSync
* DeviceCapability
* DeviceObservation
* FirmwareVersion

---

# 10. Vitals & Measurements Domain

Purpose:

Store health measurements.

Core Entities:

* BloodPressure
* HeartRate
* RespiratoryRate
* OxygenSaturation
* Temperature
* BloodGlucose
* WeightMeasurement
* HeightMeasurement
* BodyComposition
* BMIAssessment
* ECGRecording

BMI values are calculated from stored height and weight measurements and may be retained as historical assessments for trend reporting.

---

# 11. Symptoms Domain

Purpose:

Track symptoms over time.

Core Entities:

* Symptom
* SymptomCategory
* SymptomLog
* SymptomSeverity
* PainAssessment
* Trigger
* SymptomAttachment

---

# 12. Documents Domain

Purpose:

Store medical documents securely.

Core Entities:

* MedicalDocument
* LaboratoryReport
* ImagingReport
* PrescriptionDocument
* ReferralDocument
* SickLeaveDocument
* VaccinationCertificate
* QRShare

---

# 13. AI Intelligence Domain

Purpose:

Generate explainable health insights.

Core Entities:

* HealthAssessment
* WellnessScore
* RiskScore
* AIRecommendation
* AIAlert
* TrendAnalysis
* AIModel
* AIExplanation

---

# 14. Appointment Domain

Purpose:

Manage bookings and consultations.

Core Entities:

* Appointment
* AppointmentType
* AppointmentStatus
* Consultation
* TelehealthSession
* CalendarAvailability
* Reminder

---

# 15. Messaging Domain

Purpose:

Provide secure communication.

Core Entities:

* Conversation
* Participant
* Message
* Attachment
* ReadReceipt

---

# 16. Notification Domain

Purpose:

Deliver reminders and alerts.

Core Entities:

* Notification
* NotificationPreference
* PushNotification
* EmailNotification
* SMSNotification
* InAppNotification

---

# 17. Location Intelligence Domain

Purpose:

Provide location-aware healthcare services.

Core Entities:

* UserLocation
* Country
* Region
* HealthcareFacility
* ClinicLocation
* PharmacyLocation
* HospitalLocation
* EmergencyService
* TravelSession

Capabilities include:

* Nearby practitioners
* Nearby clinics
* Nearby hospitals
* Nearby pharmacies
* Nearby laboratories
* Country-specific emergency numbers
* Travel mode
* Location-aware appointment booking

---

# 18. Consent Domain

Purpose:

Allow patients to control access to their information.

Core Entities:

* Consent
* ConsentCategory
* ConsentRequest
* ConsentHistory
* SharedRecord

Patients determine:

* Who has access.
* What information may be viewed.
* How long access remains valid.
* Whether access may be renewed.

---

# 19. Research Domain

Purpose:

Support ethical research participation.

Core Entities:

* ResearchStudy
* ResearchConsent
* ResearchParticipation
* ResearchDataset

Participation is voluntary and based on informed consent.

---

# 20. Audit & Compliance Domain

Purpose:

Maintain complete traceability.

Core Entities:

* AuditLog
* AccessLog
* SecurityEvent
* ConsentAudit
* DataExport
* DataDeletionRequest

Every clinically significant action shall be auditable.

---

# 21. Administration Domain

Purpose:

Support operational management.

Core Entities:

* Configuration
* FeatureFlag
* MaintenanceWindow
* IntegrationLog
* BackgroundJob
* Announcement

---

# 22. Domain Relationships

The platform is centred around the Patient.

A Patient may:

* Own multiple wearable devices.
* Have multiple practitioners.
* Belong to one or more family groups.
* Have many appointments.
* Receive prescriptions.
* Upload documents.
* Receive AI assessments.
* Record symptoms, lifestyle activities and vital signs.
* Share records through consent management.
* Participate in research.
* Travel while maintaining access to healthcare services.

Each domain communicates through well-defined APIs while remaining logically independent.
