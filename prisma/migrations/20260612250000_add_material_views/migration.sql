-- CreateTable
CREATE TABLE "material_views" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_views_material_id_idx" ON "material_views"("material_id");

-- CreateIndex
CREATE INDEX "material_views_viewed_at_idx" ON "material_views"("viewed_at");

-- AddForeignKey
ALTER TABLE "material_views" ADD CONSTRAINT "material_views_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
