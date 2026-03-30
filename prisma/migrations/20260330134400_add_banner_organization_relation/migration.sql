-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mobile_image_url" TEXT NOT NULL,
    "desktop_image_url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "link" TEXT,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "initial_date" TIMESTAMP(3),
    "finish_date" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banners_organization_id_idx" ON "banners"("organization_id");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
