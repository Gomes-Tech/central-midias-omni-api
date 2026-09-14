-- Independent cleanup records intentionally have no cascading foreign keys.
CREATE TABLE "print_export_inputs" (
    "id" TEXT NOT NULL,
    "export_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "layer_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fit_mode" TEXT NOT NULL DEFAULT 'cover',
    "position_x" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "position_y" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "zoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "print_export_inputs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "print_export_inputs_storage_key_key" ON "print_export_inputs"("storage_key");
CREATE INDEX "print_export_inputs_export_id_idx" ON "print_export_inputs"("export_id");
CREATE INDEX "print_export_inputs_expires_at_idx" ON "print_export_inputs"("expires_at");
