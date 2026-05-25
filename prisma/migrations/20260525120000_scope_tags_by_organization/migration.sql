-- Tags used to be global. This migration scopes them by organization while
-- preserving existing material/tag links across organizations.

-- AlterTable
ALTER TABLE "tags" ADD COLUMN "organization_id" TEXT;

-- Existing material links define the organization a tag belongs to.
CREATE TEMP TABLE "_tag_orgs" AS
SELECT DISTINCT
  mt."B" AS "tag_id",
  c."organization_id"
FROM "_MaterialTag" mt
INNER JOIN "materials" m ON m."id" = mt."A"
INNER JOIN "categories" c ON c."id" = m."category_id";

CREATE TEMP TABLE "_tag_primary_org" AS
SELECT
  "tag_id",
  MIN("organization_id") AS "organization_id"
FROM "_tag_orgs"
GROUP BY "tag_id";

UPDATE "tags" t
SET "organization_id" = p."organization_id"
FROM "_tag_primary_org" p
WHERE p."tag_id" = t."id";

-- Tags without material links have no historical tenant signal. Assign them to
-- the first existing organization so they remain editable after the migration.
UPDATE "tags"
SET "organization_id" = (
  SELECT "id"
  FROM "organizations"
  ORDER BY "created_at" ASC, "id" ASC
  LIMIT 1
)
WHERE "organization_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "tags" WHERE "organization_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot scope existing tags because no organization is available';
  END IF;
END $$;

-- If a formerly-global tag was linked to materials in multiple organizations,
-- clone it for each additional organization and remap only that organization's
-- material links.
CREATE TEMP TABLE "_tag_duplicate_map" AS
SELECT
  md5(o."tag_id" || ':' || o."organization_id") AS "new_tag_id",
  o."tag_id" AS "original_tag_id",
  o."organization_id"
FROM "_tag_orgs" o
INNER JOIN "_tag_primary_org" p ON p."tag_id" = o."tag_id"
WHERE o."organization_id" <> p."organization_id";

INSERT INTO "tags" (
  "id",
  "name",
  "organization_id",
  "created_at",
  "updated_at"
)
SELECT
  dm."new_tag_id",
  t."name",
  dm."organization_id",
  t."created_at",
  t."updated_at"
FROM "_tag_duplicate_map" dm
INNER JOIN "tags" t ON t."id" = dm."original_tag_id";

UPDATE "_MaterialTag" mt
SET "B" = dm."new_tag_id"
FROM "materials" m
INNER JOIN "categories" c ON c."id" = m."category_id"
INNER JOIN "_tag_duplicate_map" dm ON dm."organization_id" = c."organization_id"
WHERE mt."A" = m."id"
  AND mt."B" = dm."original_tag_id";

INSERT INTO "tag_searches" (
  "id",
  "term",
  "search",
  "tag_id",
  "created_at"
)
SELECT
  md5(ts."id" || ':' || dm."organization_id") AS "id",
  ts."term",
  ts."search",
  dm."new_tag_id",
  ts."created_at"
FROM "tag_searches" ts
INNER JOIN "_tag_duplicate_map" dm ON dm."original_tag_id" = ts."tag_id";

-- DropIndex
DROP INDEX "tags_name_key";

-- AlterTable
ALTER TABLE "tags" ALTER COLUMN "organization_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tags_organization_id_idx" ON "tags"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_organization_id_name_key" ON "tags"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
