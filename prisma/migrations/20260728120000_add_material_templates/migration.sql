-- CreateEnum
CREATE TYPE "MaterialTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "material_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "base_material_file_id" TEXT,
    "status" "MaterialTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "document" JSONB,
    "legacy_import" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_template_assets" (
    "template_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,

    CONSTRAINT "material_template_assets_pkey" PRIMARY KEY ("template_id", "asset_id")
);

-- Migrate the legacy customization flags into draft import metadata. The
-- first PNG/JPEG ordered by id mirrors the current material download order.
INSERT INTO "material_templates" (
    "id",
    "organization_id",
    "material_id",
    "base_material_file_id",
    "status",
    "schema_version",
    "legacy_import",
    "revision",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    c."organization_id",
    m."id",
    (
        SELECT mf."id"
        FROM "material_files" mf
        WHERE mf."material_id" = m."id"
          AND lower(mf."mime_type") IN ('image/png', 'image/jpeg', 'image/jpg')
        ORDER BY mf."id" ASC
        LIMIT 1
    ),
    'DRAFT'::"MaterialTemplateStatus",
    1,
    CASE
        WHEN mc."id" IS NULL THEN NULL
        ELSE jsonb_build_object(
            'position', mc."position"::text,
            'hasPhonePrimary', mc."has_phone_primary",
            'hasPhoneSecondary', mc."has_phone_secondary",
            'hasAddress', mc."has_address",
            'hasCity', mc."has_city"
        )
    END,
    0,
    COALESCE(mc."created_at", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "materials" m
JOIN "categories" c ON c."id" = m."category_id"
LEFT JOIN "material_customizations" mc ON mc."material_id" = m."id"
WHERE m."is_customizable" = true OR mc."id" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "material_templates_material_id_key" ON "material_templates"("material_id");
CREATE UNIQUE INDEX "material_templates_base_material_file_id_key" ON "material_templates"("base_material_file_id");
CREATE INDEX "material_templates_organization_id_status_idx" ON "material_templates"("organization_id", "status");
CREATE INDEX "material_template_assets_asset_id_idx" ON "material_template_assets"("asset_id");

-- AddForeignKey
ALTER TABLE "material_templates" ADD CONSTRAINT "material_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_templates" ADD CONSTRAINT "material_templates_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_templates" ADD CONSTRAINT "material_templates_base_material_file_id_fkey" FOREIGN KEY ("base_material_file_id") REFERENCES "material_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_template_assets" ADD CONSTRAINT "material_template_assets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "material_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_template_assets" ADD CONSTRAINT "material_template_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove the legacy model after its data has been copied.
DROP TABLE "material_customizations";
DROP TYPE "CustomizationPosition";
