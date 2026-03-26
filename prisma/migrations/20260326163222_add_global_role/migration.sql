-- AlterTable
ALTER TABLE "users" ADD COLUMN     "global_role_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_global_role_id_fkey" FOREIGN KEY ("global_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
