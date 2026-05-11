-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scope_value" TEXT,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_overrides" (
    "id" TEXT NOT NULL,
    "ms_user_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_scope_scope_value_idx" ON "assignments"("scope", "scope_value");

-- CreateIndex
CREATE INDEX "assignments_resource_type_resource_id_idx" ON "assignments"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_scope_scope_value_resource_type_resource_id_key" ON "assignments"("scope", "scope_value", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "user_overrides_ms_user_id_idx" ON "user_overrides"("ms_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_overrides_ms_user_id_resource_type_resource_id_key" ON "user_overrides"("ms_user_id", "resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "user_overrides" ADD CONSTRAINT "user_overrides_ms_user_id_fkey" FOREIGN KEY ("ms_user_id") REFERENCES "ms_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
