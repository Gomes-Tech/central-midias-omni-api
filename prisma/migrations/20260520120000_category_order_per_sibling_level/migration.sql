-- DropIndex
DROP INDEX "categories_organization_id_order_key";

-- CreateIndex: ordem única entre irmãos (mesmo pai)
CREATE UNIQUE INDEX "categories_organization_id_parentId_order_key" ON "categories"("organization_id", "parentId", "order");

-- CreateIndex: ordem única entre categorias raiz (sem pai)
CREATE UNIQUE INDEX "categories_organization_id_order_root_key" ON "categories"("organization_id", "order") WHERE "parentId" IS NULL;
