-- CreateEnum
CREATE TYPE "CalendarEventColor" AS ENUM ('blue', 'green', 'red', 'yellow', 'purple', 'orange');

-- CreateTable
CREATE TABLE "calendar_event_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" "CalendarEventColor" NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "calendar_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_type_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "category_id" TEXT,
    "external_url" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_event_types_organization_id_idx" ON "calendar_event_types"("organization_id");

-- CreateIndex
CREATE INDEX "calendar_event_types_organization_id_order_idx" ON "calendar_event_types"("organization_id", "order");

-- Partial unique: slug único por org apenas entre tipos não deletados
CREATE UNIQUE INDEX "calendar_event_types_organization_id_slug_active_key"
ON "calendar_event_types"("organization_id", "slug")
WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "calendar_events_organization_id_idx" ON "calendar_events"("organization_id");

-- CreateIndex
CREATE INDEX "calendar_events_organization_id_start_date_end_date_idx" ON "calendar_events"("organization_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "calendar_events_organization_id_event_type_id_idx" ON "calendar_events"("organization_id", "event_type_id");

-- CreateIndex
CREATE INDEX "calendar_events_organization_id_category_id_idx" ON "calendar_events"("organization_id", "category_id");

-- AddForeignKey
ALTER TABLE "calendar_event_types" ADD CONSTRAINT "calendar_event_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "calendar_event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
