-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_organization_id_name_idx" ON "assets"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Register assets in RBAC and grant system administrators every action.
INSERT INTO "modules" ("id", "name", "label")
SELECT gen_random_uuid()::text, 'assets', 'Assets'
WHERE NOT EXISTS (
  SELECT 1 FROM "modules" WHERE "name" = 'assets'
);

INSERT INTO "role_permissions" ("id", "role_id", "module_id", "action")
SELECT gen_random_uuid()::text, r."id", m."id", a."action"
FROM "roles" r
CROSS JOIN "modules" m
CROSS JOIN (VALUES ('CREATE'::"Action"), ('READ'::"Action"), ('UPDATE'::"Action"), ('DELETE'::"Action")) AS a("action")
WHERE r."name" = 'ADMIN'
  AND r."is_system" = true
  AND m."name" = 'assets'
  AND NOT EXISTS (
    SELECT 1 FROM "role_permissions" rp
    WHERE rp."role_id" = r."id"
      AND rp."module_id" = m."id"
      AND rp."action" = a."action"
  );
