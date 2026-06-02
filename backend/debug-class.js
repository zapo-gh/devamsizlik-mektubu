const { PrismaClient } = require('./node_modules/@prisma/client');
const DB_PATH = process.env.APPDATA + '\\devamsizlik-mektubu\\database.db';
process.env.DATABASE_URL = 'file:' + DB_PATH.replace(/\\/g, '/');
const p = new PrismaClient();

async function run() {
  try {
    const staff = await p.$queryRaw`SELECT id, name, role, className, isActive FROM Staff WHERE role='SINIF_REHBER_OGRETMEN'`;
    console.log('SINIF_REHBER staff:', JSON.stringify(staff, null, 2));
  } catch(e) { console.log('Staff err:', e.message); }
  
  try {
    const reports = await p.$queryRaw`SELECT id, className FROM GradeReport ORDER BY uploadedAt DESC LIMIT 3`;
    console.log('GradeReports:', JSON.stringify(reports));
    if (reports.length > 0) {
      const stus = await p.$queryRaw`SELECT id, fullName, className FROM GradeReportStudent WHERE reportId=${reports[0].id} LIMIT 5`;
      console.log('Students:', JSON.stringify(stus));
    }
  } catch(e) { console.log('Report err:', e.message); }
  
  await p.$disconnect();
}
run().catch(console.error);
