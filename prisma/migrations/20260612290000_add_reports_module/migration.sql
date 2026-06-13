-- Insert reports module and grant permissions to system ADMIN roles
INSERT INTO "modules" ("id", "name", "label")
SELECT gen_random_uuid()::text, 'reports', 'Relatórios'
WHERE NOT EXISTS (
  SELECT 1 FROM "modules" WHERE "name" = 'reports'
);

INSERT INTO "role_permissions" ("id", "role_id", "module_id", "action")
SELECT gen_random_uuid()::text, r."id", m."id", a."action"
FROM "roles" r
CROSS JOIN "modules" m
CROSS JOIN (VALUES ('CREATE'::"Action"), ('READ'::"Action"), ('UPDATE'::"Action"), ('DELETE'::"Action")) AS a("action")
WHERE r."name" = 'ADMIN'
  AND r."is_system" = true
  AND m."name" = 'reports'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id"
      AND rp."module_id" = m."id"
      AND rp."action" = a."action"
  );
