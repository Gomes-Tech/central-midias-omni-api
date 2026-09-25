-- CreateEnum
CREATE TYPE "PrintRenderingIntent" AS ENUM ('RELATIVE_COLORIMETRIC', 'PERCEPTUAL', 'SATURATION', 'ABSOLUTE_COLORIMETRIC');
CREATE TYPE "PrintExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "PrintPreflightStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- Add image metadata and delivery configuration
ALTER TABLE "assets" ADD COLUMN "width" INTEGER, ADD COLUMN "height" INTEGER;
ALTER TABLE "material_files" ADD COLUMN "width" INTEGER, ADD COLUMN "height" INTEGER;
ALTER TABLE "material_templates" ADD COLUMN "digital_export_mime_type" TEXT, ADD COLUMN "print_preset_id" TEXT;

UPDATE "material_templates" mt
SET "digital_export_mime_type" = CASE
  WHEN lower(mf."mime_type") = 'image/png' THEN 'image/png'
  ELSE 'image/jpeg'
END
FROM "material_files" mf
WHERE mf."id" = mt."base_material_file_id";

-- Print profile library
CREATE TABLE "print_color_profiles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "output_condition_identifier" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "print_color_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "print_presets" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "color_profile_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trim_width_mm" DECIMAL(10,3) NOT NULL,
  "trim_height_mm" DECIMAL(10,3) NOT NULL,
  "bleed_top_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "bleed_right_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "bleed_bottom_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "bleed_left_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "safe_margin_top_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "safe_margin_right_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "safe_margin_bottom_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "safe_margin_left_mm" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "minimum_dpi" INTEGER NOT NULL DEFAULT 300,
  "include_crop_marks" BOOLEAN NOT NULL DEFAULT true,
  "crop_mark_offset_mm" DECIMAL(10,3) NOT NULL DEFAULT 3,
  "rendering_intent" "PrintRenderingIntent" NOT NULL DEFAULT 'RELATIVE_COLORIMETRIC',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "print_presets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "print_preflights" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "template_revision" INTEGER NOT NULL,
  "preset_updated_at" TIMESTAMP(3) NOT NULL,
  "status" "PrintPreflightStatus" NOT NULL DEFAULT 'PENDING',
  "issues" JSONB NOT NULL,
  "checked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "print_preflights_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "print_exports" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "material_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "template_revision" INTEGER NOT NULL,
  "document_hash" TEXT NOT NULL,
  "preset_snapshot" JSONB NOT NULL,
  "status" "PrintExportStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "error_code" TEXT,
  "error_message" TEXT,
  "file_key" TEXT,
  "checksum" TEXT,
  "size" INTEGER,
  "expires_at" TIMESTAMP(3),
  "downloaded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "print_exports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "print_color_profiles_name_key" ON "print_color_profiles"("name");
CREATE UNIQUE INDEX "print_color_profiles_storage_key_key" ON "print_color_profiles"("storage_key");
CREATE UNIQUE INDEX "print_color_profiles_checksum_key" ON "print_color_profiles"("checksum");
CREATE UNIQUE INDEX "print_presets_organization_id_name_key" ON "print_presets"("organization_id", "name");
CREATE INDEX "print_presets_color_profile_id_idx" ON "print_presets"("color_profile_id");
CREATE UNIQUE INDEX "print_preflights_template_id_key" ON "print_preflights"("template_id");
CREATE UNIQUE INDEX "print_exports_organization_id_user_id_idempotency_key_key" ON "print_exports"("organization_id", "user_id", "idempotency_key");
CREATE INDEX "print_exports_status_expires_at_idx" ON "print_exports"("status", "expires_at");
CREATE INDEX "print_exports_material_id_user_id_created_at_idx" ON "print_exports"("material_id", "user_id", "created_at");
CREATE INDEX "material_templates_print_preset_id_idx" ON "material_templates"("print_preset_id");

ALTER TABLE "print_presets" ADD CONSTRAINT "print_presets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_presets" ADD CONSTRAINT "print_presets_color_profile_id_fkey" FOREIGN KEY ("color_profile_id") REFERENCES "print_color_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_templates" ADD CONSTRAINT "material_templates_print_preset_id_fkey" FOREIGN KEY ("print_preset_id") REFERENCES "print_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "print_preflights" ADD CONSTRAINT "print_preflights_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "material_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_exports" ADD CONSTRAINT "print_exports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_exports" ADD CONSTRAINT "print_exports_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_exports" ADD CONSTRAINT "print_exports_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "material_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "print_exports" ADD CONSTRAINT "print_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
