-- CreateEnum
CREATE TYPE "CustomizationPosition" AS ENUM ('TOP', 'FOOTER');

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "is_customizable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "material_customizations" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "position" "CustomizationPosition" NOT NULL DEFAULT 'FOOTER',
    "has_phone_primary" BOOLEAN NOT NULL DEFAULT false,
    "has_phone_secondary" BOOLEAN NOT NULL DEFAULT false,
    "has_address" BOOLEAN NOT NULL DEFAULT false,
    "has_city" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_customizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "material_customizations_material_id_key" ON "material_customizations"("material_id");

-- AddForeignKey
ALTER TABLE "material_customizations" ADD CONSTRAINT "material_customizations_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
