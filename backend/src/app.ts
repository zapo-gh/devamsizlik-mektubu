import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

import { config } from './modules/shared/config';
import { errorHandler } from './modules/shared/middleware/errorHandler.middleware';
import { generalLimiter } from './modules/shared/middleware/rateLimit.middleware';
import prisma from './modules/shared/utils/prisma';
import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import student360Routes from './modules/students/student360.routes';
import studentRoutes from './modules/students/students.routes';
import absenteeismRoutes from './modules/absenteeism/absenteeism.routes';
import warningRoutes from './modules/warnings/warnings.routes';
import violationRoutes from './modules/violations/violations.routes';
import settingsRoutes from './modules/settings/settings.routes';
import staffRoutes from './modules/staff/staff.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import gradeReportRoutes from './modules/gradeReport/gradeReport.routes';
import parentMeetingRoutes from './modules/parentMeeting/parentMeeting.routes';
import parentNotificationRoutes from './modules/parentNotification/parentNotification.routes';
import tebligRoutes from './modules/teblig/teblig.routes';
import dutyScheduleRoutes from './modules/dutySchedule/dutySchedule.routes';
import boardMeetingRoutes from './modules/boardMeeting/boardMeeting.routes';
import commissionRoutes from './modules/commission/commission.routes';
import holidayRoutes from './modules/holiday/holiday.routes';
import annualPlanRoutes from './modules/annualPlan/annualPlan.routes';
import commemorativeDaysRoutes from './modules/commemorativeDays/commemorativeDays.routes';
import socialActivityRoutes from './modules/socialActivity/socialActivity.routes';
import parentAssociationRoutes from './modules/parentAssociation/parentAssociation.routes';
import fieldTripRoutes from './modules/fieldTrip/fieldTrip.routes';
import extracurricularRoutes from './modules/extracurricular/extracurricular.routes';
import travelAllowanceRoutes from './modules/travelAllowance/travelAllowance.routes';
import staffTransferRoutes from './modules/staffTransfer/staffTransfer.routes';
import studentClubRoutes from './modules/studentClub/studentClub.routes';
import procurementRoutes from './modules/procurement/procurement.routes';
import supplierRoutes from './modules/supplier/supplier.routes';
import orderLetterRoutes from './modules/orderLetter/orderLetter.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();
const uploadsDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['http://127.0.0.1:4000', 'http://localhost:4000', 'http://localhost:5173', 'http://localhost:1420', 'http://tauri.localhost', 'tauri://localhost'];
    if (!origin || allowed.includes(origin) || origin.startsWith('tauri://')) callback(null, true);
    else callback(new Error('CORS politikası: bu kaynaktan erişime izin verilmiyor.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health readiness check failed:', error);
    res.status(503).json({ status: 'not_ready', database: 'error', timestamp: new Date().toISOString() });
  }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students/360', student360Routes);
app.use('/api/students', studentRoutes);
app.use('/api/absenteeism', absenteeismRoutes);
app.use('/api/warnings', warningRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/grade-reports', gradeReportRoutes);
app.use('/api/parent-meeting', parentMeetingRoutes);
app.use('/api/parent-notification', parentNotificationRoutes);
app.use('/api/teblig', tebligRoutes);
app.use('/api/duty-schedule', dutyScheduleRoutes);
app.use('/api/board-meeting', boardMeetingRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/holiday', holidayRoutes);
app.use('/api/annual-plan', annualPlanRoutes);
app.use('/api/commemorative-days', commemorativeDaysRoutes);
app.use('/api/social-activity', socialActivityRoutes);
app.use('/api/parent-association', parentAssociationRoutes);
app.use('/api/field-trip', fieldTripRoutes);
app.use('/api/extracurricular', extracurricularRoutes);
app.use('/api/travel-allowance', travelAllowanceRoutes);
app.use('/api/staff-transfer', staffTransferRoutes);
app.use('/api/student-club', studentClubRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/order-letter', orderLetterRoutes);
app.use('/api/audit', auditRoutes);

const frontendDist = path.resolve(__dirname, 'public');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { setHeaders: (res, filepath) => { if (filepath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); } }));
  app.get(/^(?!\/api)/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);
export default app;
