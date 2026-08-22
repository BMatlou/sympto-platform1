# Sympto Master Blueprint

# Document 02 – Functional Requirements Specification

| Field          | Value                   |
| -------------- | ----------------------- |
| Project        | Sympto                  |
| Document       | Functional Requirements |
| Version        | 1.0                     |
| Status         | Draft                   |
| Classification | Internal                |
| Last Updated   | July 2026               |

---

# 1. Introduction

This document defines the functional behaviour of the Sympto platform.

Every functional requirement describes a capability the platform shall provide.

Each requirement has a unique identifier to support development, testing, traceability and future maintenance.

---

# 2. Requirement Priority

Requirements are prioritised using the MoSCoW method.

## Must Have (M)

Essential functionality required for Version 1.0.

## Should Have (S)

Important functionality that significantly improves the platform but may be delivered after the initial release.

## Could Have (C)

Desirable enhancements that provide additional value.

## Won't Have Yet (W)

Future capabilities intentionally deferred to later versions.

---

# 3. Authentication

## FR-AUTH-001 (M)

The system shall allow users to register using an email address.

---

## FR-AUTH-002 (M)

The system shall allow users to register using a mobile phone number.

---

## FR-AUTH-003 (M)

The system shall verify email ownership before activating an account.

---

## FR-AUTH-004 (M)

The system shall verify phone ownership using a one-time verification code.

---

## FR-AUTH-005 (M)

The system shall support secure login using email and password.

---

## FR-AUTH-006 (M)

The system shall support secure login using phone number and password.

---

## FR-AUTH-007 (S)

The system should support biometric authentication on supported devices.

---

## FR-AUTH-008 (M)

The system shall support multi-factor authentication.

---

## FR-AUTH-009 (M)

The system shall securely reset forgotten passwords.

---

## FR-AUTH-010 (M)

The system shall automatically lock accounts after repeated failed login attempts.

---

## FR-AUTH-011 (S)

The system should notify users whenever a login occurs from a new device.

---

## FR-AUTH-012 (M)

The system shall allow users to terminate active sessions from any device.

---

# 4. User Management

## FR-USER-001 (M)

The system shall create a unique account for every registered user.

---

## FR-USER-002 (M)

Each user shall have a globally unique identifier.

---

## FR-USER-003 (M)

Users shall be able to edit their personal information.

---

## FR-USER-004 (M)

Users shall be able to upload a profile photograph.

---

## FR-USER-005 (M)

Users shall be configure language preferences.

---

## FR-USER-006 (M)

Users shall configure timezone preferences.

---

## FR-USER-007 (M)

Users shall manage notification preferences.

---

## FR-USER-008 (M)

Users shall configure privacy settings.

---

## FR-USER-009 (M)

Users shall download a copy of their personal data.

---

## FR-USER-010 (M)

Users shall permanently delete their account subject to applicable legal and medical record retention requirements.

---

# 5. Identity Verification

## FR-ID-001 (M)

The system shall allow users to submit a national identity document or passport for identity verification.

---

## FR-ID-002 (M)

The system shall support identity verification for multiple countries.

---

## FR-ID-003 (M)

The system shall store verification status separately from identity documents.

---

## FR-ID-004 (M)

Identity verification documents shall be encrypted.

---

## FR-ID-005 (M)

The system shall allow administrators to approve or reject verification requests.

---

## FR-ID-006 (S)

The system should support automated identity verification using trusted verification providers.

---

## FR-ID-007 (M)

Users shall be notified of the outcome of their verification request.

---

# 6. Practitioner Verification

## FR-PRAC-001 (M)

The system shall require healthcare practitioners to complete professional verification before providing clinical services.

---

## FR-PRAC-002 (M)

The system shall capture practitioner registration numbers issued by the appropriate regulatory authority for the practitioner's jurisdiction.

---

## FR-PRAC-003 (M)

The system shall support verification of licences and credentials.

---

## FR-PRAC-004 (M)

Practitioners shall belong to one or more healthcare organisations.

---

## FR-PRAC-005 (M)

Practitioners shall define their specialties.

---

## FR-PRAC-006 (M)

Practitioners shall define consultation availability.

---

## FR-PRAC-007 (M)

Practitioners shall configure telehealth availability.

---

## FR-PRAC-008 (M)

Practitioners shall configure consultation fees where applicable.

---

## FR-PRAC-009 (M)

Practitioners shall maintain professional profiles.

---

## FR-PRAC-010 (M)

Practitioner approval shall require administrator verification before activation.
