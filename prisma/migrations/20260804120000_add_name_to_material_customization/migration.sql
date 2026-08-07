-- AlterTable
ALTER TABLE "material_customizations" ADD COLUMN "has_name" BOOLEAN;

-- Preserve the current behavior for existing customizable materials.
UPDATE "material_customizations" SET "has_name" = true;

-- New materials must explicitly enable name customization.
ALTER TABLE "material_customizations"
ALTER COLUMN "has_name" SET DEFAULT false,
ALTER COLUMN "has_name" SET NOT NULL;
