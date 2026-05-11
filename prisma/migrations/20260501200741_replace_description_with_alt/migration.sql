/*
  Warnings:

  - You are about to drop the column `description` on the `banners` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `certifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "banners" DROP COLUMN "description",
ADD COLUMN     "alt" TEXT;

-- AlterTable
ALTER TABLE "certifications" DROP COLUMN "description",
ADD COLUMN     "alt" TEXT;
