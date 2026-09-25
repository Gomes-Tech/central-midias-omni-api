ALTER TABLE "material_files"
ADD COLUMN "original_name" TEXT,
ADD COLUMN "sort_order" INTEGER;

WITH "ranked_material_files" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "material_id"
            ORDER BY "id" ASC
        ) - 1 AS "sort_order"
    FROM "material_files"
)
UPDATE "material_files" AS "material_file"
SET "sort_order" = "ranked_material_files"."sort_order"
FROM "ranked_material_files"
WHERE "material_file"."id" = "ranked_material_files"."id";

ALTER TABLE "material_files"
ALTER COLUMN "sort_order" SET NOT NULL;

CREATE UNIQUE INDEX "material_files_material_id_sort_order_key"
ON "material_files"("material_id", "sort_order");

ALTER TABLE "print_export_inputs"
ADD COLUMN "material_file_id" TEXT;
