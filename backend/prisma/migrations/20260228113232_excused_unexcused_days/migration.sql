/*
  Warnings:

  - You are about to drop the column `totalDays` on the `Absenteeism` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Absenteeism" DROP COLUMN "totalDays",
ADD COLUMN     "excusedDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unexcusedDays" INTEGER NOT NULL DEFAULT 0;
