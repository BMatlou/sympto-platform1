# Sympto Master Blueprint

# Document 03 – Non-Functional Requirements

| Field          | Value                       |
| -------------- | --------------------------- |
| Project        | Sympto                      |
| Document       | Non-Functional Requirements |
| Version        | 1.0                         |
| Status         | Draft                       |
| Classification | Internal                    |
| Last Updated   | July 2026                   |

---

# 1. Introduction

This document defines the quality attributes and operational characteristics of the Sympto platform.

Unlike functional requirements, which describe what the system does, non-functional requirements describe how the system must perform, protect data, scale, and remain reliable.

These requirements apply across all platform components, including the patient mobile application, practitioner portal, backend services, AI services, wearable integrations, and supporting infrastructure.

---

# 2. Security

## NFR-SEC-001

All communication between clients, APIs and services shall use encrypted transport (TLS).

---

## NFR-SEC-002

Sensitive information shall be encrypted at rest.

---

## NFR-SEC-003

Passwords shall never be stored in plain text.

---

## NFR-SEC-004

Passwords shall be stored using a modern password hashing algorithm.

---

## NFR-SEC-005

The platform shall support Multi-Factor Authentication (MFA).

---

## NFR-SEC-006

Role-Based Access Control (RBAC) shall be implemented across all services.

---

## NFR-SEC-007

All access to medical information shall be audited.

---

## NFR-SEC-008

Users shall be able to terminate active sessions.

---

## NFR-SEC-009

Administrative actions shall require elevated permissions.

---

# 3. Privacy

## NFR-PRI-001

Patients remain the owners of their personal health information.

---

## NFR-PRI-002

Patients shall control who may access their health records.

---

## NFR-PRI-003

Consent shall be granular and revocable.

---

## NFR-PRI-004

The platform shall support time-limited sharing of medical records.

---

## NFR-PRI-005

Health data shall not be shared with third parties without user consent or another lawful basis where required by applicable law.

---

## NFR-PRI-006

Research participation shall require explicit informed consent.

---

# 4. Compliance

The platform shall be designed to support:

* POPIA
* GDPR

The platform architecture should also be capable of supporting additional regional healthcare regulations as the product expands.

---

## NFR-COM-001

The platform shall maintain complete audit logs.

---

## NFR-COM-002

Medical record modifications shall be traceable.

---

## NFR-COM-003

Consent changes shall be recorded.

---

## NFR-COM-004

Identity verification records shall be securely retained according to applicable legal requirements.

---

# 5. Performance

## NFR-PER-001

The platform shall provide responsive user experiences for common operations under expected load.

---

## NFR-PER-002

Background processing shall be used for long-running tasks where appropriate (for example, AI analysis, notifications, and wearable synchronisation).

---

## NFR-PER-003

The platform shall support horizontal scaling of backend services.

---

# 6. Availability

## NFR-AVL-001

Critical services should be designed for high availability.

---

## NFR-AVL-002

Automated backups shall be performed.

---

## NFR-AVL-003

Disaster recovery procedures shall be documented and tested.

---

# 7. Scalability

The architecture shall support growth in:

* Users
* Practitioners
* Healthcare organisations
* Connected wearable devices
* AI workloads
* Medical documents
* Integrations

The platform shall be designed using modular services that can scale independently.

---

# 8. Offline Support

The mobile application shall support offline operation for selected features.

Users shall be able to:

* Record symptoms.
* Record medications.
* Record hydration.
* Record exercise.
* Record sleep.
* View previously synchronised health records.

Data shall automatically synchronise when connectivity is restored.

---

# 9. Reliability

The platform shall:

* Detect failures.
* Recover gracefully.
* Retry temporary failures where appropriate.
* Preserve user data during synchronisation.

No confirmed health record should be lost because of temporary connectivity problems.

---

# 10. Auditability

Every clinically relevant action shall be auditable.

Examples include:

* Viewing records.
* Editing records.
* Uploading documents.
* AI recommendations.
* Prescription creation.
* Consent changes.
* Practitioner access.

Audit logs shall include timestamps, the actor, the action performed, and the affected resource.

---

# 11. AI Explainability

Every AI-generated recommendation shall include:

* Contributing data.
* Reasoning summary.
* Confidence indicator where available.
* Timestamp.
* AI model version.
* Appropriate clinical disclaimer.

AI shall support healthcare professionals rather than replace clinical judgement.

---

# 12. Data Provenance

Every observation shall record its source.

Examples include:

* Manual entry.
* Apple Health.
* Health Connect.
* Garmin.
* Fitbit.
* Huawei Health.
* Sympto Watch.
* Laboratory.
* Healthcare practitioner.
* Imported medical document.

The platform shall preserve provenance throughout the data lifecycle.

---

# 13. Interoperability

The platform shall be designed for interoperability with external healthcare systems.

This includes support for:

* Electronic Health Record systems.
* Laboratories.
* Pharmacies.
* Wearable platforms.
* Healthcare organisations.

Core health data should be structured so that it can be mapped to FHIR resources during integration projects.

---

# 14. Accessibility

The platform shall be designed to support accessible user experiences.

Considerations include:

* Readable typography.
* Screen reader compatibility.
* Colour contrast.
* Keyboard navigation (web).
* Scalable text sizes.

---

# 15. Internationalisation

The platform shall support:

* Multiple languages.
* Multiple time zones.
* Country-specific date formats.
* Country-specific units of measurement where applicable.

---

# 16. Maintainability

The platform shall be modular.

Business domains shall be separated into independent modules to simplify maintenance, testing and future enhancements.

---

# 17. Observability

The platform shall provide:

* Structured logging.
* Metrics.
* Error reporting.
* Health monitoring.
* Performance monitoring.
* Integration monitoring.

---

# 18. Data Retention

The platform shall define configurable retention policies for:

* Audit logs.
* Notifications.
* Session history.
* Medical documents.
* Uploaded files.

Retention policies shall respect applicable legal and regulatory requirements.

---

# 19. Business Continuity

The platform shall support:

* Backup restoration.
* Disaster recovery.
* Service continuity planning.
* Incident management procedures.

---

# 20. Future Readiness

The architecture shall support future expansion without requiring major redesign.

Future capabilities may include:

* Sympto Watch.
* Additional wearable devices.
* National health system integrations.
* AI-assisted clinical decision support.
* Medical imaging analysis.
* Population health analytics.
* International healthcare provider networks.
