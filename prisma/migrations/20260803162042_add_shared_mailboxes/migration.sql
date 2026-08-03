-- AlterTable
ALTER TABLE "ms_users" ADD COLUMN     "is_shared_mailbox" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "shared_mailbox_members" (
    "id" TEXT NOT NULL,
    "shared_mailbox_id" TEXT NOT NULL,
    "ms_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_mailbox_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_mailbox_members_ms_user_id_idx" ON "shared_mailbox_members"("ms_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shared_mailbox_members_shared_mailbox_id_ms_user_id_key" ON "shared_mailbox_members"("shared_mailbox_id", "ms_user_id");

-- CreateIndex
CREATE INDEX "ms_users_is_shared_mailbox_idx" ON "ms_users"("is_shared_mailbox");

-- AddForeignKey
ALTER TABLE "shared_mailbox_members" ADD CONSTRAINT "shared_mailbox_members_shared_mailbox_id_fkey" FOREIGN KEY ("shared_mailbox_id") REFERENCES "ms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_mailbox_members" ADD CONSTRAINT "shared_mailbox_members_ms_user_id_fkey" FOREIGN KEY ("ms_user_id") REFERENCES "ms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
