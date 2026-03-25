/*
  Warnings:

  - A unique constraint covering the columns `[tax_identifier]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tax_identifier` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_first_access" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "social_reason" TEXT,
ADD COLUMN     "tax_identifier" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_tax_identifier_key" ON "users"("tax_identifier");
