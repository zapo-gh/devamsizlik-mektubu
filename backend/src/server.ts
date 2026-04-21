import { execSync } from 'child_process';
import app from './app';
import { config } from './modules/shared/config';
import prisma from './modules/shared/utils/prisma';

async function main() {
  try {
    // Run migrations (uses DIRECT_URL if set, otherwise DATABASE_URL)
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    } catch (e) {
      console.warn('⚠️  prisma migrate deploy failed (may already be up-to-date):', (e as Error).message);
    }

    // Seed admin user
    try {
      execSync('node prisma/seed-admin.js', { stdio: 'inherit' });
    } catch (e) {
      console.warn('⚠️  seed-admin failed:', (e as Error).message);
    }

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📋 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
