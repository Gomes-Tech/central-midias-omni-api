-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "has_text_copy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "text_copy" TEXT;
