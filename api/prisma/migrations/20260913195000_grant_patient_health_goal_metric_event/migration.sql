-- Grant patients the permission required to record their own health-goal metric events.
-- The endpoint is protected by JwtAuthGuard + PermissionsGuard and requires
-- `health-goals.update`. Patients previously had only `health-goals.read`.

INSERT INTO "Permission" ("id", "name", "createdAt", "updatedAt")
VALUES (
    md5('permission:health-goals.update'),
    'health-goals.update',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId")
SELECT
    md5('role-permission:PATIENT:health-goals.update'),
    r."id",
    p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'PATIENT'
  AND p."name" = 'health-goals.update'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
