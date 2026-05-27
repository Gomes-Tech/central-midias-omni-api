-- Add slug_path column (nullable for backfill)
ALTER TABLE "categories" ADD COLUMN "slug_path" TEXT;

-- Backfill slug_path from hierarchy
WITH RECURSIVE category_paths AS (
  SELECT id, slug, "parentId", slug AS slug_path
  FROM "categories"
  WHERE "parentId" IS NULL

  UNION ALL

  SELECT c.id, c.slug, c."parentId", cp.slug_path || '/' || c.slug
  FROM "categories" c
  INNER JOIN category_paths cp ON c."parentId" = cp.id
)
UPDATE "categories" c
SET slug_path = cp.slug_path
FROM category_paths cp
WHERE c.id = cp.id;

-- Make slug_path required
ALTER TABLE "categories" ALTER COLUMN "slug_path" SET NOT NULL;

-- DropIndex: global slug uniqueness per organization
DROP INDEX "categories_organization_id_slug_key";

-- CreateIndex: unique slug path per organization
CREATE UNIQUE INDEX "categories_organization_id_slug_path_key" ON "categories"("organization_id", "slug_path");

-- CreateIndex: unique slug among siblings
CREATE UNIQUE INDEX "categories_organization_id_parentId_slug_key" ON "categories"("organization_id", "parentId", "slug");

-- CreateIndex: unique slug among root categories (parentId IS NULL)
CREATE UNIQUE INDEX "categories_organization_id_slug_root_key" ON "categories"("organization_id", "slug") WHERE "parentId" IS NULL;
