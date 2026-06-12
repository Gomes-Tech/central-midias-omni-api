-- CreateTable
CREATE TABLE "social_highlights" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mobile_image_key" TEXT NOT NULL,
    "desktop_image_key" TEXT NOT NULL,
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

    CONSTRAINT "social_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_highlights_organization_id_idx" ON "social_highlights"("organization_id");

-- AddForeignKey
ALTER TABLE "social_highlights" ADD CONSTRAINT "social_highlights_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
