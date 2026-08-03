-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "legal_texts" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "banners_sort_order_idx" ON "banners"("sort_order");

-- CreateIndex
CREATE INDEX "legal_texts_sort_order_idx" ON "legal_texts"("sort_order");
