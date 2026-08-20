-- AlterTable: Student - gradeReportStudents relation is implicit, no column change needed

-- CreateTable: GradeReport
CREATE TABLE "GradeReport" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "className"   TEXT NOT NULL,
    "schoolYear"  TEXT NOT NULL,
    "meetingDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "karneText"   TEXT,
    "uploadedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: GradeReportStudent
CREATE TABLE "GradeReportStudent" (
    "id"             TEXT NOT NULL PRIMARY KEY,
    "reportId"       TEXT NOT NULL,
    "studentId"      TEXT,
    "fullName"       TEXT NOT NULL,
    "className"      TEXT NOT NULL,
    "tcKimlikNo"     TEXT,
    "schoolNumber"   TEXT,
    "failedSubjects" TEXT NOT NULL,
    "pdfPath"        TEXT,
    "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GradeReportStudent_reportId_fkey"  FOREIGN KEY ("reportId")  REFERENCES "GradeReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GradeReportStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GradeReportStudent_reportId_idx"  ON "GradeReportStudent"("reportId");
CREATE INDEX "GradeReportStudent_studentId_idx" ON "GradeReportStudent"("studentId");
