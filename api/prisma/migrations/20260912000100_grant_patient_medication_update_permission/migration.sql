-- Grant the existing patient-medication.update permission to the PATIENT role.
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
