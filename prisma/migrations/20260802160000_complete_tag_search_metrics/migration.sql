-- Expand tag search events so they can be recorded idempotently and survive tag deletion.
ALTER TABLE "tag_searches"
ADD COLUMN "search_id" TEXT,
ADD COLUMN "organization_id" TEXT,
ADD COLUMN "user_id" TEXT,
ADD COLUMN "tag_name" TEXT;

UPDATE "tag_searches" ts
SET
  "search_id" = ts."id",
  "organization_id" = t."organization_id",
  "tag_name" = t."name",
  "term" = LOWER(REGEXP_REPLACE(BTRIM(ts."search"), '\s+', ' ', 'g'))
FROM "tags" t
WHERE t."id" = ts."tag_id";

ALTER TABLE "tag_searches"
ALTER COLUMN "search_id" SET NOT NULL,
ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "tag_name" SET NOT NULL,
ALTER COLUMN "tag_id" DROP NOT NULL;

ALTER TABLE "tag_searches"
DROP CONSTRAINT "tag_searches_tag_id_fkey";

ALTER TABLE "tag_searches"
ADD CONSTRAINT "tag_searches_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "tag_searches_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "tag_searches_tag_id_fkey"
FOREIGN KEY ("tag_id") REFERENCES "tags"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "tag_searches_organization_id_user_id_search_id_tag_name_key"
ON "tag_searches"("organization_id", "user_id", "search_id", "tag_name");

CREATE INDEX "tag_searches_organization_id_created_at_idx"
ON "tag_searches"("organization_id", "created_at");

CREATE INDEX "tag_searches_organization_id_term_idx"
ON "tag_searches"("organization_id", "term");
