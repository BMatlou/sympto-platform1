-- Allow authenticated patients to log/update their own health-goal metric events.
-- The metric-event service scopes the write to the patient resolved from the JWT user.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'PATIENT'
  AND p."name" = 'health-goals.update'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
