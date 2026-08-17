import prisma from './prisma';

/**
 * SQLite için tabloları CREATE TABLE IF NOT EXISTS ile oluşturur.
 * PostgreSQL migration sistemi yerine Electron masaüstü uygulamasında kullanılır.
 */
export async function initializeDatabase(): Promise<void> {
  await prisma.$queryRawUnsafe(`PRAGMA journal_mode=WAL`);
  await prisma.$queryRawUnsafe(`PRAGMA foreign_keys=ON`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id"                 TEXT    NOT NULL PRIMARY KEY,
      "username"           TEXT    NOT NULL UNIQUE,
      "password"           TEXT    NOT NULL,
      "role"               TEXT    NOT NULL DEFAULT 'PARENT',
      "mustChangePassword" INTEGER NOT NULL DEFAULT 0,
      "createdAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Mevcut DB'lerde mustChangePassword sütunu yoksa ekle
  const userCols = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info("User")`);
  if (!userCols.some((c) => c.name === 'mustChangePassword')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "mustChangePassword" INTEGER NOT NULL DEFAULT 0`);
    console.log('✅ User.mustChangePassword sütunu eklendi');
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Student" (
      "id"           TEXT NOT NULL PRIMARY KEY,
      "schoolNumber" TEXT NOT NULL UNIQUE,
      "fullName"     TEXT NOT NULL,
      "className"    TEXT NOT NULL,
      "status"       TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Parent" (
      "id"       TEXT NOT NULL PRIMARY KEY,
      "userId"   TEXT NOT NULL UNIQUE,
      "fullName" TEXT NOT NULL,
      "phone"    TEXT NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Parent_phone_idx" ON "Parent"("phone")`
  );

  // _StudentParents join tablosu: Prisma A = Parent.id, B = Student.id (alfabetik sıra: P < S)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_StudentParents" (
      "A" TEXT NOT NULL,
      "B" TEXT NOT NULL,
      FOREIGN KEY ("A") REFERENCES "Parent"("id") ON DELETE CASCADE,
      FOREIGN KEY ("B") REFERENCES "Student"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "_StudentParents_AB_unique" ON "_StudentParents"("A", "B")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "_StudentParents_B_index" ON "_StudentParents"("B")`
  );

  // Mevcut veritabanlarında FK sırası yanlış olabilir — düzelt
  const tableRows = await prisma.$queryRawUnsafe<{ sql: string }[]>(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='_StudentParents'`
  );
  const tableSql: string = tableRows[0]?.sql ?? '';
  const aRefIdx = tableSql.indexOf('REFERENCES "Student"');
  const bRefIdx = tableSql.indexOf('REFERENCES "Parent"');
  const hasWrongFKOrder = aRefIdx !== -1 && bRefIdx !== -1 && aRefIdx < bRefIdx;

  if (hasWrongFKOrder) {
    // FK sırası ters: A → Student, B → Parent. Prisma A'ya Parent.id koyuyor, bu FK ihlali yapıyor.
    // Tablo muhtemelen boş (tüm insertler başarısız oldu), yeniden oluştur.
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=OFF`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "_StudentParents_fixed" (
        "A" TEXT NOT NULL,
        "B" TEXT NOT NULL,
        FOREIGN KEY ("A") REFERENCES "Parent"("id") ON DELETE CASCADE,
        FOREIGN KEY ("B") REFERENCES "Student"("id") ON DELETE CASCADE
      )
    `);
    // Varsa mevcut veriyi çevirerek aktar (A ve B yer değiştiriyordu)
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "_StudentParents_fixed" ("A","B") SELECT "B","A" FROM "_StudentParents"`
    );
    await prisma.$executeRawUnsafe(`DROP TABLE "_StudentParents"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "_StudentParents_fixed" RENAME TO "_StudentParents"`);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "_StudentParents_AB_unique" ON "_StudentParents"("A", "B")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "_StudentParents_B_index" ON "_StudentParents"("B")`
    );
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=ON`);
    console.log('✅ _StudentParents FK sırası düzeltildi');
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Absenteeism" (
      "id"             TEXT    NOT NULL PRIMARY KEY,
      "studentId"      TEXT    NOT NULL,
      "warningNumber"  INTEGER NOT NULL DEFAULT 1,
      "isBep"          INTEGER NOT NULL DEFAULT 0,
      "pdfPath"        TEXT    NOT NULL,
      "previewPath"    TEXT,
      "excusedDays"    REAL,
      "unexcusedDays"  REAL,
      "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "viewedByParent" INTEGER NOT NULL DEFAULT 0,
      "waSentAt"       DATETIME,
      FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Absenteeism_studentId_idx" ON "Absenteeism"("studentId")`
  );

  // Mevcut DB'lerde eksik sütunlar varsa ekle
  const absenteeismCols = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `PRAGMA table_info("Absenteeism")`
  );
  const absenteeismMissing: [string, string][] = [
    ['isBep',         'INTEGER NOT NULL DEFAULT 0'],
    ['previewPath',   'TEXT'],
    ['excusedDays',   'REAL'],
    ['unexcusedDays', 'REAL'],
    ['waSentAt',      'DATETIME'],
  ];
  for (const [col, def] of absenteeismMissing) {
    if (!absenteeismCols.some((c) => c.name === col)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Absenteeism" ADD COLUMN "${col}" ${def}`
      );
      console.log(`✅ Absenteeism.${col} sütunu eklendi`);
    }
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WrittenWarning" (
      "id"                  TEXT    NOT NULL PRIMARY KEY,
      "studentId"           TEXT    NOT NULL,
      "warningNumber"       INTEGER NOT NULL DEFAULT 1,
      "behaviorCode"        TEXT    NOT NULL,
      "behaviorText"        TEXT    NOT NULL,
      "description"         TEXT,
      "guidanceNote"        TEXT,
      "classTeacherName"    TEXT,
      "schoolCounselorName" TEXT,
      "pdfPath"             TEXT    NOT NULL,
      "issuedBy"            TEXT    NOT NULL DEFAULT 'Okul Yönetimi',
      "issuedAt"            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "waSentAt"            DATETIME,
      FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "WrittenWarning_studentId_idx" ON "WrittenWarning"("studentId")`
  );

  // Mevcut DB'lerde eksik sütunlar varsa ekle
  const writtenWarningCols = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `PRAGMA table_info("WrittenWarning")`
  );
  const writtenWarningMissing: [string, string][] = [
    ['guidanceNote',        'TEXT'],
    ['classTeacherName',    'TEXT'],
    ['schoolCounselorName', 'TEXT'],
    ['waSentAt',            'DATETIME'],
  ];
  for (const [col, def] of writtenWarningMissing) {
    if (!writtenWarningCols.some((c) => c.name === col)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "WrittenWarning" ADD COLUMN "${col}" ${def}`
      );
      console.log(`✅ WrittenWarning.${col} sütunu eklendi`);
    }
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ViolationUpload" (
      "id"            TEXT    NOT NULL PRIMARY KEY,
      "type"          TEXT    NOT NULL,
      "description"   TEXT,
      "imagePath"     TEXT    NOT NULL,
      "ocrRawText"    TEXT,
      "uploadedBy"    TEXT    NOT NULL DEFAULT 'Okul Yönetimi',
      "violationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DailyViolation" (
      "id"            TEXT    NOT NULL PRIMARY KEY,
      "studentId"     TEXT    NOT NULL,
      "uploadId"      TEXT    NOT NULL,
      "type"          TEXT    NOT NULL,
      "violationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "matchedBy"     TEXT    NOT NULL DEFAULT 'OCR',
      "isConfirmed"   INTEGER NOT NULL DEFAULT 0,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE,
      FOREIGN KEY ("uploadId")  REFERENCES "ViolationUpload"("id") ON DELETE CASCADE,
      UNIQUE("studentId", "uploadId")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DailyViolation_studentId_idx" ON "DailyViolation"("studentId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DailyViolation_uploadId_idx" ON "DailyViolation"("uploadId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DailyViolation_type_idx" ON "DailyViolation"("type")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DailyViolation_violationDate_idx" ON "DailyViolation"("violationDate")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SchoolSettings" (
      "id"            TEXT    NOT NULL PRIMARY KEY DEFAULT 'singleton',
      "schoolName"    TEXT    NOT NULL DEFAULT '',
      "principalName" TEXT    NOT NULL DEFAULT '',
      "academicYear"  TEXT    NOT NULL DEFAULT '2025-2026',
      "waTemplate1"   TEXT             DEFAULT '',
      "waTemplate2"   TEXT             DEFAULT '',
      "waTemplate3"   TEXT             DEFAULT '',
      "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Mevcut DB'lerde waTemplate sütunları yoksa ekle
  const schoolSettingsCols = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `PRAGMA table_info("SchoolSettings")`
  );
  for (const col of ['waTemplate1', 'waTemplate2', 'waTemplate3']) {
    if (!schoolSettingsCols.some((c) => c.name === col)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "SchoolSettings" ADD COLUMN "${col}" TEXT DEFAULT ''`
      );
      console.log(`✅ SchoolSettings.${col} sütunu eklendi`);
    }
  }

  if (!schoolSettingsCols.some((c) => c.name === 'academicYear')) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "SchoolSettings" ADD COLUMN "academicYear" TEXT NOT NULL DEFAULT '2025-2026'`
    );
    console.log('✅ SchoolSettings.academicYear sütunu eklendi');
  }

  // Varsayılan SchoolSettings satırını ekle
  await prisma.$executeRawUnsafe(`
    INSERT OR IGNORE INTO "SchoolSettings" ("id", "schoolName", "principalName", "updatedAt")
    VALUES ('singleton', '', '', CURRENT_TIMESTAMP)
  `);

  // Personel tablosu
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Staff" (
      "id"        TEXT    NOT NULL PRIMARY KEY,
      "name"      TEXT    NOT NULL,
      "role"      TEXT    NOT NULL,
      "className" TEXT,
      "isActive"  INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Staff_role_idx" ON "Staff"("role")`
  );

  // Karne / Akademik Başarısızlık Bildirimi tabloları
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GradeReport" (
      "id"          TEXT     NOT NULL PRIMARY KEY,
      "className"   TEXT     NOT NULL,
      "schoolYear"  TEXT     NOT NULL,
      "meetingDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "karneText"   TEXT,
      "uploadedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "archived"    INTEGER  NOT NULL DEFAULT 0
    )
  `);

  // Mevcut DB'lerde archived sütunu yoksa ekle
  const gradeReportCols = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `PRAGMA table_info("GradeReport")`
  );
  if (!gradeReportCols.some((c) => c.name === 'archived')) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "GradeReport" ADD COLUMN "archived" INTEGER NOT NULL DEFAULT 0`
    );
    console.log('✅ GradeReport.archived sütunu eklendi');
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GradeReportStudent" (
      "id"             TEXT     NOT NULL PRIMARY KEY,
      "reportId"       TEXT     NOT NULL,
      "studentId"      TEXT,
      "fullName"       TEXT     NOT NULL,
      "className"      TEXT     NOT NULL,
      "tcKimlikNo"     TEXT,
      "schoolNumber"   TEXT,
      "failedSubjects" TEXT     NOT NULL,
      "pdfPath"        TEXT,
      "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("reportId")  REFERENCES "GradeReport"("id") ON DELETE CASCADE,
      FOREIGN KEY ("studentId") REFERENCES "Student"("id")     ON DELETE SET NULL
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "GradeReportStudent_reportId_idx"  ON "GradeReportStudent"("reportId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "GradeReportStudent_studentId_idx" ON "GradeReportStudent"("studentId")`
  );

  // ── Resmi Tatiller ───────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Holiday" (
      "id"          TEXT     NOT NULL PRIMARY KEY,
      "name"        TEXT     NOT NULL,
      "startDate"   TEXT     NOT NULL,
      "endDate"     TEXT     NOT NULL,
      "academicYear" TEXT    NOT NULL,
      "isRecurring" INTEGER NOT NULL DEFAULT 0,
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Nöbet Çizelgesi ─────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DutyStation" (
      "id"        TEXT     NOT NULL PRIMARY KEY,
      "name"      TEXT     NOT NULL,
      "sortOrder" INTEGER  NOT NULL DEFAULT 0,
      "isActive"  INTEGER  NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DutyAssignment" (
      "id"           TEXT     NOT NULL PRIMARY KEY,
      "staffId"      TEXT     NOT NULL,
      "stationId"    TEXT     NOT NULL,
      "dayOfWeek"    INTEGER  NOT NULL,
      "weekNumber"   INTEGER  NOT NULL DEFAULT 0,
      "academicYear" TEXT     NOT NULL,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("staffId")   REFERENCES "Staff"("id")       ON DELETE CASCADE,
      FOREIGN KEY ("stationId") REFERENCES "DutyStation"("id")  ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DutyAssignment_staffId_idx" ON "DutyAssignment"("staffId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DutyAssignment_stationId_idx" ON "DutyAssignment"("stationId")`
  );

  // ── Öğretmenler Kurulu Toplantısı ────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BoardMeeting" (
      "id"            TEXT     NOT NULL PRIMARY KEY,
      "date"          TEXT     NOT NULL,
      "type"          TEXT     NOT NULL DEFAULT 'DONEM_BASI',
      "meetingNumber" INTEGER  NOT NULL DEFAULT 1,
      "academicYear"  TEXT     NOT NULL,
      "notes"         TEXT,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BoardAgendaItem" (
      "id"          TEXT     NOT NULL PRIMARY KEY,
      "meetingId"   TEXT     NOT NULL,
      "orderNumber" INTEGER  NOT NULL DEFAULT 1,
      "topic"       TEXT     NOT NULL,
      "decision"    TEXT,
      "explanation" TEXT,
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("meetingId") REFERENCES "BoardMeeting"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "BoardAgendaItem_meetingId_idx" ON "BoardAgendaItem"("meetingId")`
  );

  // ── Kurul ve Komisyonlar ─────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Commission" (
      "id"           TEXT     NOT NULL PRIMARY KEY,
      "name"         TEXT     NOT NULL,
      "description"  TEXT,
      "academicYear" TEXT     NOT NULL,
      "sortOrder"    INTEGER  NOT NULL DEFAULT 0,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CommissionRole" (
      "id"           TEXT     NOT NULL PRIMARY KEY,
      "commissionId" TEXT     NOT NULL,
      "roleName"     TEXT     NOT NULL,
      "sortOrder"    INTEGER  NOT NULL DEFAULT 0,
      FOREIGN KEY ("commissionId") REFERENCES "Commission"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CommissionRole_commissionId_idx" ON "CommissionRole"("commissionId")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CommissionAssignment" (
      "id"      TEXT NOT NULL PRIMARY KEY,
      "roleId"  TEXT NOT NULL,
      "staffId" TEXT NOT NULL,
      FOREIGN KEY ("roleId")  REFERENCES "CommissionRole"("id") ON DELETE CASCADE,
      FOREIGN KEY ("staffId") REFERENCES "Staff"("id")          ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CommissionAssignment_roleId_idx"  ON "CommissionAssignment"("roleId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CommissionAssignment_staffId_idx" ON "CommissionAssignment"("staffId")`
  );

  // ── Yıllık Çalışma Planı ────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AnnualPlanItem" (
      "id"           TEXT     NOT NULL PRIMARY KEY,
      "academicYear" TEXT     NOT NULL,
      "month"        INTEGER  NOT NULL,
      "title"        TEXT     NOT NULL,
      "description"  TEXT,
      "category"     TEXT     NOT NULL DEFAULT 'IDARI',
      "sortOrder"    INTEGER  NOT NULL DEFAULT 0,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AnnualPlanItem_academicYear_idx" ON "AnnualPlanItem"("academicYear")`
  );

  // ── Belirli Gün ve Haftalar ──────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CommemorativeDay" (
      "id"           TEXT     NOT NULL PRIMARY KEY,
      "name"         TEXT     NOT NULL,
      "startDate"    TEXT     NOT NULL,
      "endDate"      TEXT     NOT NULL,
      "academicYear" TEXT     NOT NULL,
      "description"  TEXT,
      "assignedStaffId" TEXT,
      "status"       TEXT     NOT NULL DEFAULT 'PLANLI',
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CommemorativeDay_academicYear_idx" ON "CommemorativeDay"("academicYear")`
  );

  // ── Sosyal Etkinlik Planı ────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SocialActivity" (
      "id"              TEXT     NOT NULL PRIMARY KEY,
      "name"            TEXT     NOT NULL,
      "type"            TEXT     NOT NULL DEFAULT 'KULTUREL',
      "description"     TEXT,
      "plannedDate"     TEXT,
      "academicYear"    TEXT     NOT NULL,
      "assignedStaffId" TEXT,
      "status"          TEXT     NOT NULL DEFAULT 'PLANLI',
      "notes"           TEXT,
      "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SocialActivity_academicYear_idx" ON "SocialActivity"("academicYear")`
  );

  // ── Okul Aile Birliği ───────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ParentAssociationMeeting" (
      "id"            TEXT     NOT NULL PRIMARY KEY,
      "date"          TEXT     NOT NULL,
      "type"          TEXT     NOT NULL DEFAULT 'OLAGAN',
      "meetingNumber" INTEGER  NOT NULL DEFAULT 1,
      "academicYear"  TEXT     NOT NULL,
      "notes"         TEXT,
      "decisions"     TEXT,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ParentAssociationMember" (
      "id"           TEXT     NOT NULL PRIMARY KEY,
      "fullName"     TEXT     NOT NULL,
      "role"         TEXT     NOT NULL DEFAULT 'UYE',
      "phone"        TEXT,
      "academicYear" TEXT     NOT NULL,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Gezi Planı ──────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FieldTrip" (
      "id"              TEXT     NOT NULL PRIMARY KEY,
      "title"           TEXT     NOT NULL,
      "destination"     TEXT     NOT NULL,
      "date"            TEXT     NOT NULL,
      "returnDate"      TEXT,
      "purpose"         TEXT,
      "transportation"  TEXT,
      "assignedStaffId" TEXT,
      "academicYear"    TEXT     NOT NULL,
      "participantClasses" TEXT,
      "notes"           TEXT,
      "status"          TEXT     NOT NULL DEFAULT 'PLANLI',
      "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Ders Dışı Egzersiz Planı ────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Extracurricular" (
      "id"              TEXT     NOT NULL PRIMARY KEY,
      "branch"          TEXT     NOT NULL,
      "assignedStaffId" TEXT,
      "schedule"        TEXT,
      "academicYear"    TEXT     NOT NULL,
      "notes"           TEXT,
      "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Yolluk Hesaplama ────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TravelAllowance" (
      "id"              TEXT     NOT NULL PRIMARY KEY,
      "staffId"         TEXT,
      "staffName"       TEXT     NOT NULL,
      "title"           TEXT,
      "purpose"         TEXT     NOT NULL,
      "departurePlace"  TEXT     NOT NULL,
      "arrivalPlace"    TEXT     NOT NULL,
      "departureDate"   TEXT     NOT NULL,
      "returnDate"      TEXT     NOT NULL,
      "transportType"   TEXT     NOT NULL DEFAULT 'OTOBÜS',
      "transportCost"   REAL     NOT NULL DEFAULT 0,
      "dailyAllowance"  REAL     NOT NULL DEFAULT 0,
      "accommodationCost" REAL   NOT NULL DEFAULT 0,
      "totalCost"       REAL     NOT NULL DEFAULT 0,
      "academicYear"    TEXT     NOT NULL,
      "notes"           TEXT,
      "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Personel Nakil Bildirimi ────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StaffTransfer" (
      "id"              TEXT     NOT NULL PRIMARY KEY,
      "staffName"       TEXT     NOT NULL,
      "staffTitle"      TEXT,
      "tcKimlikNo"      TEXT,
      "sicilNo"         TEXT,
      "currentSchool"   TEXT,
      "newSchool"       TEXT,
      "transferDate"    TEXT     NOT NULL,
      "transferReason"  TEXT,
      "academicYear"    TEXT     NOT NULL,
      "notes"           TEXT,
      "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Öğrenci Kulüpleri ───────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StudentClub" (
      "id"              TEXT     NOT NULL PRIMARY KEY,
      "name"            TEXT     NOT NULL,
      "description"     TEXT,
      "assignedStaffId" TEXT,
      "meetingDay"      TEXT,
      "meetingTime"     TEXT,
      "maxMembers"      INTEGER  NOT NULL DEFAULT 30,
      "academicYear"    TEXT     NOT NULL,
      "isActive"        INTEGER  NOT NULL DEFAULT 1,
      "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StudentClubMember" (
      "id"        TEXT     NOT NULL PRIMARY KEY,
      "clubId"    TEXT     NOT NULL,
      "studentId" TEXT     NOT NULL,
      "role"      TEXT     NOT NULL DEFAULT 'UYE',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("clubId")    REFERENCES "StudentClub"("id") ON DELETE CASCADE,
      FOREIGN KEY ("studentId") REFERENCES "Student"("id")     ON DELETE CASCADE,
      UNIQUE("clubId", "studentId")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "StudentClubMember_clubId_idx"    ON "StudentClubMember"("clubId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "StudentClubMember_studentId_idx" ON "StudentClubMember"("studentId")`
  );

  // 🏢 Tedarikçiler (Firmalar)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Supplier" (
      "id"            TEXT     NOT NULL PRIMARY KEY,
      "name"          TEXT     NOT NULL,
      "taxNumber"     TEXT,
      "taxOffice"     TEXT,
      "phone"         TEXT,
      "address"       TEXT,
      "contactPerson" TEXT,
      "isActive"      INTEGER  NOT NULL DEFAULT 1,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 📝 Sipariş Mektubu
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OrderLetter" (
      "id"              TEXT     NOT NULL PRIMARY KEY,
      "subject"         TEXT     NOT NULL,
      "supplierName"    TEXT     NOT NULL,
      "supplierAddress" TEXT,
      "date"            TEXT     NOT NULL,
      "deliveryDate"    TEXT     NOT NULL,
      "academicYear"    TEXT     NOT NULL,
      "items"           TEXT     NOT NULL,
      "notes"           TEXT,
      "extraData"       TEXT,
      "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 📝 Doğrudan Temin Dosyaları
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Procurement" (
      "id"             TEXT     NOT NULL PRIMARY KEY,
      "title"          TEXT     NOT NULL,
      "procedureType"  TEXT     NOT NULL DEFAULT '22/d',
      "date"           TEXT     NOT NULL,
      "estimatedCost"  REAL     DEFAULT 0,
      "status"         TEXT     NOT NULL DEFAULT 'BEKLIYOR',
      "academicYear"   TEXT     NOT NULL,
      "createdAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 📦 Doğrudan Temin Kalemleri (Mal/Hizmet Listesi)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProcurementItem" (
      "id"                 TEXT NOT NULL PRIMARY KEY,
      "procurementId"      TEXT NOT NULL,
      "name"               TEXT NOT NULL,
      "quantity"           REAL NOT NULL DEFAULT 1,
      "unit"               TEXT NOT NULL DEFAULT 'Adet',
      "estimatedUnitPrice" REAL DEFAULT 0,
      FOREIGN KEY ("procurementId") REFERENCES "Procurement"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProcurementItem_procId_idx" ON "ProcurementItem"("procurementId")`);

  // 💰 Firmalardan Alınan Fiyat Teklifleri
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProcurementOffer" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "procurementId" TEXT NOT NULL,
      "supplierId"    TEXT NOT NULL,
      "itemId"        TEXT NOT NULL,
      "offeredPrice"  REAL NOT NULL DEFAULT 0,
      "isWinner"      INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY ("procurementId") REFERENCES "Procurement"("id") ON DELETE CASCADE,
      FOREIGN KEY ("supplierId")    REFERENCES "Supplier"("id") ON DELETE CASCADE,
      FOREIGN KEY ("itemId")        REFERENCES "ProcurementItem"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProcurementOffer_procId_idx" ON "ProcurementOffer"("procurementId")`);
}
