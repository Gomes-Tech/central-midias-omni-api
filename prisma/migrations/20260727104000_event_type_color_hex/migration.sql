-- AlterTable: convert CalendarEventColor enum to hex string
ALTER TABLE "calendar_event_types" ADD COLUMN "color_hex" VARCHAR(7);

UPDATE "calendar_event_types"
SET "color_hex" = CASE "color"::text
  WHEN 'blue' THEN '#2563EB'
  WHEN 'green' THEN '#16A34A'
  WHEN 'red' THEN '#DC2626'
  WHEN 'yellow' THEN '#CA8A04'
  WHEN 'purple' THEN '#9333EA'
  WHEN 'orange' THEN '#EA580C'
  ELSE '#2563EB'
END;

ALTER TABLE "calendar_event_types" DROP COLUMN "color";
ALTER TABLE "calendar_event_types" RENAME COLUMN "color_hex" TO "color";
ALTER TABLE "calendar_event_types" ALTER COLUMN "color" SET NOT NULL;

DROP TYPE "CalendarEventColor";
