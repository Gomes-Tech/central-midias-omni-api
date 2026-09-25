-- No-op for the assets drop on this branch.
--
-- On main this migration dropped "assets" to undo an accidental apply of
-- image-editor schema against production. This branch still uses "assets"
-- (editor / material_template_assets). Keep the migration folder so Prisma
-- history stays aligned with main, but do not drop the table.
--
-- The leftover index from 20260407141142 is safe to remove here; the current
-- lookup is tag_searches_organization_id_term_idx.

DROP INDEX IF EXISTS "tag_searches_term_idx";
