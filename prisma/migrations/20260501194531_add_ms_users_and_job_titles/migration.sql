-- CreateTable
CREATE TABLE "ms_users" (
    "id" TEXT NOT NULL,
    "ms_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "given_name" TEXT,
    "surname" TEXT,
    "job_title" TEXT,
    "department" TEXT,
    "office_location" TEXT,
    "city" TEXT,
    "country" TEXT,
    "company_name" TEXT,
    "mobile_phone" TEXT,
    "business_phones" TEXT[],
    "user_principal_name" TEXT NOT NULL,
    "account_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ms_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_titles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ms_users_ms_id_key" ON "ms_users"("ms_id");

-- CreateIndex
CREATE UNIQUE INDEX "ms_users_email_key" ON "ms_users"("email");

-- CreateIndex
CREATE INDEX "ms_users_country_idx" ON "ms_users"("country");

-- CreateIndex
CREATE INDEX "ms_users_department_idx" ON "ms_users"("department");

-- CreateIndex
CREATE INDEX "ms_users_job_title_idx" ON "ms_users"("job_title");

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_title_key" ON "job_titles"("title");

-- AddForeignKey
ALTER TABLE "ms_users" ADD CONSTRAINT "ms_users_job_title_fkey" FOREIGN KEY ("job_title") REFERENCES "job_titles"("title") ON DELETE SET NULL ON UPDATE CASCADE;
