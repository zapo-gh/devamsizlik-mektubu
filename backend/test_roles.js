const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const allStaff = await prisma.staff.findMany();
  console.log("Unvans:", Array.from(new Set(allStaff.map(s => s.unvan))));
  console.log("Roles:", Array.from(new Set(allStaff.map(s => s.role))));
  console.log("Gorevs:", Array.from(new Set(allStaff.map(s => s.gorev))));
}
main().catch(console.error).finally(() => prisma.$disconnect());
