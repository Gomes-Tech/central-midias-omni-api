-- DropIndex
DROP INDEX "users_tax_identifier_key";

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "only_view" BOOLEAN NOT NULL DEFAULT false;
