-- CreateTable
CREATE TABLE "user_platform_logins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_platform_logins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_platform_logins_user_id_key" ON "user_platform_logins"("user_id");

-- CreateIndex
CREATE INDEX "user_platform_logins_last_login_at_idx" ON "user_platform_logins"("last_login_at");

-- AddForeignKey
ALTER TABLE "user_platform_logins" ADD CONSTRAINT "user_platform_logins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
