ALTER TABLE "material_templates"
ADD COLUMN "allowed_export_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "material_templates"
SET "allowed_export_types" = ARRAY_REMOVE(
  ARRAY[
    CASE
      WHEN "digital_export_mime_type" = 'image/png' THEN 'png'
      ELSE NULL
    END,
    CASE
      WHEN "digital_export_mime_type" IN ('image/jpeg', 'image/jpg') THEN 'jpg'
      ELSE NULL
    END,
    'pdf',
    CASE
      WHEN "print_preset_id" IS NOT NULL THEN 'print_pdf'
      ELSE NULL
    END
  ]::TEXT[],
  NULL
);
