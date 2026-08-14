-- No-op on this branch.
--
-- On main this migration added "has_name" to "material_customizations".
-- On image-editor that table was already dropped by
-- 20260728120000_add_material_templates (replaced by material_templates /
-- legacy_import). Keep the migration folder so Prisma history stays aligned
-- with main, but do not touch the removed relation.
SELECT 1;
