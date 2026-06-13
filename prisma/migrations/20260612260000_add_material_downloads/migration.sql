-- CreateTable
CREATE TABLE "material_downloads" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "downloaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_downloads_material_id_idx" ON "material_downloads"("material_id");

-- CreateIndex
CREATE INDEX "material_downloads_user_id_idx" ON "material_downloads"("user_id");

-- CreateIndex
CREATE INDEX "material_downloads_downloaded_at_idx" ON "material_downloads"("downloaded_at");

-- AddForeignKey
ALTER TABLE "material_downloads" ADD CONSTRAINT "material_downloads_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_downloads" ADD CONSTRAINT "material_downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
