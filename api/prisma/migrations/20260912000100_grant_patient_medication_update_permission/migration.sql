-- Ensure the existing patient-medication.update permission exists and grant it to PATIENT.
INSERT INTO "Permission" ("id", "name", "description", "createdAt", "updatedAt")
VALUES (
  md5('patient-medication.update')::uuid,
  'patient-medication.update',
  'Update patient medication records and adherence.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
  md5(r."id" || p."id")::uuid,
  r."id",
  p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'PATIENT'
  AND p."name" = 'patient-medication.update'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
