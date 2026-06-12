-- AlterTable
ALTER TABLE "materials" ADD COLUMN "requires_acceptance" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "material_acceptances" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_acceptances_material_id_idx" ON "material_acceptances"("material_id");

-- CreateIndex
CREATE INDEX "material_acceptances_user_id_idx" ON "material_acceptances"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_acceptances_material_id_user_id_key" ON "material_acceptances"("material_id", "user_id");

-- AddForeignKey
ALTER TABLE "material_acceptances" ADD CONSTRAINT "material_acceptances_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_acceptances" ADD CONSTRAINT "material_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
