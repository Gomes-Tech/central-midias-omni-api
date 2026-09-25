-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_documents_organization_id_key" ON "supplier_documents"("organization_id");

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
