-- CreateTable
CREATE TABLE IF NOT EXISTS "supplier_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_documents_organization_id_key" ON "supplier_documents"("organization_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'supplier_documents_organization_id_fkey'
  ) THEN
    ALTER TABLE "supplier_documents"
      ADD CONSTRAINT "supplier_documents_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Cleanup from previous migration attempt on organizations
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "suppliers_document_key";
