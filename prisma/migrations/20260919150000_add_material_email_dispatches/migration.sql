-- CreateTable
CREATE TABLE "material_email_dispatches" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "material_id" TEXT,
    "material_name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_email_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_email_dispatch_recipients" (
    "id" TEXT NOT NULL,
    "dispatch_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_email_dispatch_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_email_dispatches_organization_id_created_at_idx" ON "material_email_dispatches"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "material_email_dispatches_material_id_idx" ON "material_email_dispatches"("material_id");

-- CreateIndex
CREATE INDEX "material_email_dispatch_recipients_dispatch_id_idx" ON "material_email_dispatch_recipients"("dispatch_id");

-- CreateIndex
CREATE INDEX "material_email_dispatch_recipients_email_idx" ON "material_email_dispatch_recipients"("email");

-- AddForeignKey
ALTER TABLE "material_email_dispatches" ADD CONSTRAINT "material_email_dispatches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_email_dispatches" ADD CONSTRAINT "material_email_dispatches_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_email_dispatch_recipients" ADD CONSTRAINT "material_email_dispatch_recipients_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "material_email_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_email_dispatch_recipients" ADD CONSTRAINT "material_email_dispatch_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
