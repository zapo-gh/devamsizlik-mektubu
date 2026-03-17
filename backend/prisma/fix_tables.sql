-- Add missing columns to OTP
ALTER TABLE "OTP" ADD COLUMN IF NOT EXISTS "token" TEXT;
UPDATE "OTP" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;
ALTER TABLE "OTP" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "OTP" ALTER COLUMN "token" SET DEFAULT gen_random_uuid()::text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'OTP_token_key') THEN
    CREATE UNIQUE INDEX "OTP_token_key" ON "OTP"("token");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "OTP_token_idx" ON "OTP"("token");

-- Add missing columns to Absenteeism
ALTER TABLE "Absenteeism" ADD COLUMN IF NOT EXISTS "warningNumber" INTEGER DEFAULT 1;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Absenteeism' AND column_name='totalDays') THEN
    ALTER TABLE "Absenteeism" DROP COLUMN "totalDays";
  END IF;
END $$;

-- Create ViolationType enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ViolationType') THEN
    CREATE TYPE "ViolationType" AS ENUM ('KIYAFET', 'TOREN_GEC', 'DIGER');
  END IF;
END $$;

-- Create WrittenWarning table
CREATE TABLE IF NOT EXISTS "WrittenWarning" (
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
CREATE INDEX IF NOT EXISTS "WrittenWarning_studentId_idx" ON "WrittenWarning"("studentId");
ALTER TABLE "WrittenWarning" DROP CONSTRAINT IF EXISTS "WrittenWarning_studentId_fkey";
ALTER TABLE "WrittenWarning" ADD CONSTRAINT "WrittenWarning_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create ViolationUpload table
CREATE TABLE IF NOT EXISTS "ViolationUpload" (
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

-- Create DailyViolation table
CREATE TABLE IF NOT EXISTS "DailyViolation" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "DailyViolation_studentId_uploadId_key" ON "DailyViolation"("studentId", "uploadId");
CREATE INDEX IF NOT EXISTS "DailyViolation_studentId_idx" ON "DailyViolation"("studentId");
CREATE INDEX IF NOT EXISTS "DailyViolation_uploadId_idx" ON "DailyViolation"("uploadId");
CREATE INDEX IF NOT EXISTS "DailyViolation_type_idx" ON "DailyViolation"("type");
CREATE INDEX IF NOT EXISTS "DailyViolation_violationDate_idx" ON "DailyViolation"("violationDate");
ALTER TABLE "DailyViolation" DROP CONSTRAINT IF EXISTS "DailyViolation_studentId_fkey";
ALTER TABLE "DailyViolation" ADD CONSTRAINT "DailyViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyViolation" DROP CONSTRAINT IF EXISTS "DailyViolation_uploadId_fkey";
ALTER TABLE "DailyViolation" ADD CONSTRAINT "DailyViolation_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ViolationUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create SchoolSettings table
CREATE TABLE IF NOT EXISTS "SchoolSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "schoolName" TEXT NOT NULL DEFAULT '',
    "principalName" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolSettings_pkey" PRIMARY KEY ("id")
);
