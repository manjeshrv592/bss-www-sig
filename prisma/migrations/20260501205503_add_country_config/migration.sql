-- CreateTable
CREATE TABLE "country_config" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_config_country_key" ON "country_config"("country");
