-- CreateTable
CREATE TABLE "registration_lines" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_lines" (
    "id" TEXT NOT NULL,
    "left_text" TEXT NOT NULL,
    "right_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "footer_lines_pkey" PRIMARY KEY ("id")
);
