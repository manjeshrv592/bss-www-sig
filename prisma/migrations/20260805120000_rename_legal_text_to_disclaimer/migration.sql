-- Rename "legal text" to "disclaimer" throughout.
--
-- Written by hand: Prisma renders a model rename as DROP + CREATE, which would
-- discard every disclaimer. ALTER TABLE ... RENAME keeps the rows and their ids,
-- so existing assignments and user overrides keep pointing at the right records.

ALTER TABLE "legal_texts" RENAME TO "disclaimers";
ALTER INDEX "legal_texts_pkey" RENAME TO "disclaimers_pkey";
ALTER INDEX "legal_texts_sort_order_idx" RENAME TO "disclaimers_sort_order_idx";

-- resourceType is a plain string column, so stored values need updating too.
UPDATE "assignments"     SET "resource_type" = 'disclaimer' WHERE "resource_type" = 'legal_text';
UPDATE "user_overrides"  SET "resource_type" = 'disclaimer' WHERE "resource_type" = 'legal_text';

-- Country config is superseded by the footer line resource, which carries the
-- website, and by the company name synced from Microsoft Graph.
DROP TABLE IF EXISTS "country_config";
