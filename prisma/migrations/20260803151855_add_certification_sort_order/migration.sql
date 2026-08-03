-- AlterTable
ALTER TABLE "certifications" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "certifications_sort_order_idx" ON "certifications"("sort_order");
