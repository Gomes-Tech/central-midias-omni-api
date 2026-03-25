-- CreateTable
CREATE TABLE "seed_status" (
    "id" TEXT NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_status_pkey" PRIMARY KEY ("id")
);
