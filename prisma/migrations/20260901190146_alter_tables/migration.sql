/*
  Warnings:

  - You are about to drop the `assets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "assets" DROP CONSTRAINT "assets_organization_id_fkey";

-- DropIndex
DROP INDEX "tag_searches_term_idx";

-- DropTable
DROP TABLE "assets";
