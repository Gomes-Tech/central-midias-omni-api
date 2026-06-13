-- CreateTable
CREATE TABLE "user_platform_login_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_platform_login_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_platform_login_events_user_id_idx" ON "user_platform_login_events"("user_id");

-- CreateIndex
CREATE INDEX "user_platform_login_events_login_at_idx" ON "user_platform_login_events"("login_at");

-- AddForeignKey
ALTER TABLE "user_platform_login_events" ADD CONSTRAINT "user_platform_login_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
