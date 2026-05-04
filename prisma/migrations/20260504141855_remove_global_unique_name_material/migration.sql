-- DropForeignKey
ALTER TABLE "_MaterialTag" DROP CONSTRAINT "_MaterialTag_A_fkey";

-- DropIndex
DROP INDEX "materials_name_key";

-- AddForeignKey
ALTER TABLE "_MaterialTag" ADD CONSTRAINT "_MaterialTag_A_fkey" FOREIGN KEY ("A") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
