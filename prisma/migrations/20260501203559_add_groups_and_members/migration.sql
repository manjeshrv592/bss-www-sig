-- CreateTable
CREATE TABLE "ms_groups" (
    "id" TEXT NOT NULL,
    "ms_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "mail_enabled" BOOLEAN NOT NULL DEFAULT false,
    "security_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ms_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ms_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "ms_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ms_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ms_groups_ms_id_key" ON "ms_groups"("ms_id");

-- CreateIndex
CREATE INDEX "ms_group_members_ms_user_id_idx" ON "ms_group_members"("ms_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ms_group_members_group_id_ms_user_id_key" ON "ms_group_members"("group_id", "ms_user_id");

-- AddForeignKey
ALTER TABLE "ms_group_members" ADD CONSTRAINT "ms_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ms_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ms_group_members" ADD CONSTRAINT "ms_group_members_ms_user_id_fkey" FOREIGN KEY ("ms_user_id") REFERENCES "ms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
