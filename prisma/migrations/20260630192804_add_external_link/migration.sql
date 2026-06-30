-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "external_link" TEXT,
ADD COLUMN     "has_external_link" BOOLEAN NOT NULL DEFAULT false;
