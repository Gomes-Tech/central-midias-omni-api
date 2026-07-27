-- DropForeignKey
ALTER TABLE "calendar_events" DROP CONSTRAINT IF EXISTS "calendar_events_category_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "calendar_events_organization_id_category_id_idx";

-- AlterTable
ALTER TABLE "calendar_events" DROP COLUMN IF EXISTS "category_id";

-- CreateTable
CREATE TABLE "calendar_event_materials" (
    "event_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,

    CONSTRAINT "calendar_event_materials_pkey" PRIMARY KEY ("event_id","material_id")
);

-- CreateIndex
CREATE INDEX "calendar_event_materials_material_id_idx" ON "calendar_event_materials"("material_id");

-- AddForeignKey
ALTER TABLE "calendar_event_materials" ADD CONSTRAINT "calendar_event_materials_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_materials" ADD CONSTRAINT "calendar_event_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
