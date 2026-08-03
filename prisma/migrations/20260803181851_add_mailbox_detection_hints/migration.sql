-- AlterTable
ALTER TABLE "ms_users" ADD COLUMN     "has_mailbox" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_licensed" BOOLEAN NOT NULL DEFAULT false;
