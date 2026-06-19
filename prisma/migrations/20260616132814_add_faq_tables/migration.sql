-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "faq_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_details" (
    "id" TEXT NOT NULL,
    "faq_id" TEXT NOT NULL,
    "image_key" TEXT,
    "description" TEXT,
    "phone_primary" TEXT,
    "phone_primary_label" TEXT,
    "phone_primary_is_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "phone_secondary" TEXT,
    "phone_secondary_label" TEXT,
    "phone_secondary_is_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faqs_organization_id_idx" ON "faqs"("organization_id");

-- CreateIndex
CREATE INDEX "faq_items_organization_id_idx" ON "faq_items"("organization_id");

-- CreateIndex
CREATE INDEX "faq_items_faq_id_idx" ON "faq_items"("faq_id");

-- CreateIndex
CREATE UNIQUE INDEX "faq_details_faq_id_key" ON "faq_details"("faq_id");

-- AddForeignKey
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_items" ADD CONSTRAINT "faq_items_faq_id_fkey" FOREIGN KEY ("faq_id") REFERENCES "faqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_details" ADD CONSTRAINT "faq_details_faq_id_fkey" FOREIGN KEY ("faq_id") REFERENCES "faqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
