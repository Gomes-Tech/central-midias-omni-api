/*
  Warnings:

  - You are about to drop the column `desktop_image_url` on the `banners` table. All the data in the column will be lost.
  - You are about to drop the column `mobile_image_url` on the `banners` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_url` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_url` on the `users` table. All the data in the column will be lost.
  - Added the required column `desktop_image_key` to the `banners` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobile_image_key` to the `banners` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "banners" DROP COLUMN "desktop_image_url",
DROP COLUMN "mobile_image_url",
ADD COLUMN     "desktop_image_key" TEXT NOT NULL,
ADD COLUMN     "mobile_image_key" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "avatar_url",
ADD COLUMN     "avatar_key" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar_url",
ADD COLUMN     "avatar_key" TEXT;

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "category_id" TEXT NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_files" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "image_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "material_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_searches" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "search" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MaterialTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MaterialTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "materials_name_key" ON "materials"("name");

-- CreateIndex
CREATE INDEX "materials_category_id_idx" ON "materials"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "materials_category_id_name_key" ON "materials"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tag_searches_tag_id_idx" ON "tag_searches"("tag_id");

-- CreateIndex
CREATE INDEX "tag_searches_term_idx" ON "tag_searches"("term");

-- CreateIndex
CREATE INDEX "tag_searches_search_idx" ON "tag_searches"("search");

-- CreateIndex
CREATE INDEX "_MaterialTag_B_index" ON "_MaterialTag"("B");

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_files" ADD CONSTRAINT "material_files_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_searches" ADD CONSTRAINT "tag_searches_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialTag" ADD CONSTRAINT "_MaterialTag_A_fkey" FOREIGN KEY ("A") REFERENCES "material_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MaterialTag" ADD CONSTRAINT "_MaterialTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
