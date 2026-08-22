# Sympto Master Blueprint

# Document 05 – Entity Relationship Diagram (ERD)

| Field          | Value                       |
| -------------- | --------------------------- |
| Project        | Sympto                      |
| Document       | Entity Relationship Diagram |
| Version        | 1.0                         |
| Status         | Draft                       |
| Classification | Internal                    |
| Last Updated   | July 2026                   |

---

# Purpose

This document describes the logical data model of the Sympto platform.

The detailed ERD diagrams are maintained in the `docs/master-blueprint/diagrams/` directory.

Each business domain has its own ERD to improve readability and maintainability.

---

# Domain Diagrams

The following ERDs form the complete logical data model:

1. Platform Overview
2. Identity & Access
3. Patient Management
4. Practitioner Management
5. Medical Records
6. Lifestyle & Wellness
7. Wearables
8. Vital Signs
9. Symptoms
10. Documents
11. AI Intelligence
12. Appointments
13. Messaging
14. Notifications
15. Consent
16. Pharmacy
17. Laboratory
18. Research
19. Administration
20. Audit & Compliance

---

# Modelling Principles

* Every entity has a primary key.
* Foreign keys define relationships.
* Soft deletion is preferred where appropriate.
* Audit fields are included on business entities.
* Sensitive data is encrypted where required.
* Medical observations record provenance.
* Domain boundaries are respected.

---

# Relationship Types

The data model uses:

* One-to-One
* One-to-Many
* Many-to-Many (through junction entities)

---

# Implementation

The ERD is the authoritative source for:

* Prisma models
* Database migrations
* API contracts
* Validation rules
* Data ownership
* Integration mapping
