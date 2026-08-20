-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('KIYAFET', 'TOREN_GEC', 'DIGER');

-- AlterTable: Absenteeism - replace excusedDays/unexcusedDays with warningNumber
ALTER TABLE "Absenteeism" DROP COLUMN IF EXISTS "excusedDays";
ALTER TABLE "Absenteeism" DROP COLUMN IF EXISTS "unexcusedDays";
ALTER TABLE "Absenteeism" ADD COLUMN IF NOT EXISTS "warningNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: OTP - add token column
ALTER TABLE "OTP" ADD COLUMN IF NOT EXISTS "token" TEXT;
UPDATE "OTP" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;
ALTER TABLE "OTP" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "OTP" ALTER COLUMN "token" SET DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OTP_token_key" ON "OTP"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OTP_token_idx" ON "OTP"("token");

-- CreateTable
CREATE TABLE "WrittenWarning" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "warningNumber" INTEGER NOT NULL DEFAULT 1,
    "behaviorCode" TEXT NOT NULL,
    "behaviorText" TEXT NOT NULL,
    "description" TEXT,
    "pdfPath" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL DEFAULT 'Okul Yönetimi',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WrittenWarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WrittenWarning_studentId_idx" ON "WrittenWarning"("studentId");

-- AddForeignKey
ALTER TABLE "WrittenWarning" ADD CONSTRAINT "WrittenWarning_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ViolationUpload" (
    "id" TEXT NOT NULL,
    "type" "ViolationType" NOT NULL,
    "description" TEXT,
    "imagePath" TEXT NOT NULL,
    "ocrRawText" TEXT,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Okul Yönetimi',
    "violationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViolationUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyViolation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "type" "ViolationType" NOT NULL,
    "violationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedBy" TEXT NOT NULL DEFAULT 'OCR',
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyViolation_studentId_uploadId_key" ON "DailyViolation"("studentId", "uploadId");

-- CreateIndex
CREATE INDEX "DailyViolation_studentId_idx" ON "DailyViolation"("studentId");

-- CreateIndex
CREATE INDEX "DailyViolation_uploadId_idx" ON "DailyViolation"("uploadId");

-- CreateIndex
CREATE INDEX "DailyViolation_type_idx" ON "DailyViolation"("type");

-- CreateIndex
CREATE INDEX "DailyViolation_violationDate_idx" ON "DailyViolation"("violationDate");

-- AddForeignKey
ALTER TABLE "DailyViolation" ADD CONSTRAINT "DailyViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyViolation" ADD CONSTRAINT "DailyViolation_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ViolationUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SchoolSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "schoolName" TEXT NOT NULL DEFAULT '',
    "principalName" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolSettings_pkey" PRIMARY KEY ("id")
);
