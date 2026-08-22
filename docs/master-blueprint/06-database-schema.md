# Sympto Master Blueprint

# Document 06 – Database Schema Specification

| Field          | Value                         |
| -------------- | ----------------------------- |
| Project        | Sympto                        |
| Document       | Database Schema Specification |
| Version        | 1.0                           |
| Status         | Draft                         |
| Classification | Internal                      |
| Last Updated   | July 2026                     |

---

# 1. Purpose

This document defines the logical database design for the Sympto platform.

It is the authoritative specification for:

* PostgreSQL database design
* Prisma models
* Database migrations
* NestJS DTOs
* Validation rules
* API contracts
* Data ownership
* Indexing strategy
* Audit strategy

Every table implemented in the platform must conform to this specification.

---

# 2. Design Principles

## 2.1 UUID Primary Keys

All business entities shall use UUID primary keys.

Reason:

* Globally unique
* Secure
* Suitable for distributed systems
* Easier future integrations

---

## 2.2 Soft Delete

Business entities shall support soft deletion where appropriate.

Standard field:

* deletedAt

Reference data (for example Country and Language) should generally not be soft deleted.

---

## 2.3 Audit Fields

Business entities should include:

* createdAt
* updatedAt

Clinically significant entities should additionally include:

* createdBy
* updatedBy

where tracking the actor adds value for auditing and compliance.

---

## 2.4 Foreign Keys

Foreign key naming convention:

* personId
* userId
* patientId
* practitionerId
* countryId

Always use singular names.

---

## 2.5 Naming Standards

### Tables

Singular

Examples:

* Person
* Patient
* Appointment
* Prescription

### Columns

camelCase

Examples:

* firstName
* lastName
* createdAt

### Junction Tables

EntityAEntityB

Examples:

* UserRole
* PatientPractitioner
* PractitionerSpecialty

---

# 3. Core Domains

The database is organised into the following domains:

1. Identity & Access
2. Patient
3. Practitioner
4. Medical Records
5. Lifestyle & Wellness
6. Wearables
7. Vitals & Measurements
8. Symptoms
9. Documents
10. AI Intelligence
11. Appointments
12. Messaging
13. Notifications
14. Consent
15. Pharmacy
16. Laboratory
17. Research
18. Billing & Finance
19. Audit & Compliance
20. Administration

Each domain owns its own entities and relationships while remaining connected through well-defined foreign keys.

---

# 4. Common Entity Template

Every new business entity should document:

* Purpose
* Columns
* Data types
* Required fields
* Defaults
* Unique constraints
* Foreign keys
* Relationships
* Indexes
* Validation rules
* Soft delete policy
* Audit policy

---

# 5. Core Reference Data

The platform maintains reference entities for commonly reused values, including:

* Country
* Language
* Currency
* TimeZone
* Medical Specialty
* Exercise Type
* Symptom Category
* Medication Unit
* Blood Type
* Allergy Category

Reference data should be centrally managed and reused throughout the platform.

---

# 6. Data Integrity

The platform shall enforce:

* Primary keys
* Foreign key constraints
* Unique constraints where required
* Check constraints where applicable
* Referential integrity
* Transactional consistency

---

# 7. Indexing Strategy

Indexes shall be created for:

* Foreign keys
* Frequently searched fields
* Authentication fields (email, phone)
* Appointment dates
* Medical record timestamps
* Practitioner search fields
* Geolocation queries where supported

Index usage should be reviewed as the platform evolves.

---

# 8. Security

Sensitive data shall be protected using:

* Encryption at rest where appropriate
* Secure password hashing
* Least-privilege database access
* Audit logging
* Access controls

---

# 9. Versioning

Database changes shall be managed using Prisma migrations.

No schema changes shall be made directly in production databases outside the migration process.

---

# 10. Next Steps

Subsequent sections of this specification will define each entity in detail before implementation.

Each entity specification will become the basis for:

* Prisma model generation
* PostgreSQL migrations
* NestJS services
* DTOs
* API endpoints
* Flutter models
