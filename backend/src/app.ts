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

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Global middleware
app.use(helmet({
  // CSP frontend SPA ile çakışmaması için devre dışı (statik dosya zaten backend üzerinden sunuluyor)
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
// Electron masaüstü modunda yalnızca localhost origin'ine izin ver
app.use(cors({ 
  origin: (origin, callback) => {
    // Electron içi isteklerde origin yoktur; yalnızca localhost'a izin ver
    if (!origin || origin === 'http://127.0.0.1:4000' || origin === 'http://localhost:4000' || origin === 'http://localhost:5173') {
      callback(null, true);
    } else {
      callback(new Error('CORS politikası: bu kaynaktan erişime izin verilmiyor.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global API rate limiter
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
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

// WhatsApp: önceki oturum varsa otomatik bağlan
// WhatsApp otomatik bağlantı devre dışı — kullanıcı /admin/whatsapp sayfasından Bağlan butonuna basmalı
// whatsappService.initialize().catch(() => { /* Oturum yok, QR bekleniyor */ });

// Frontend statik dosyaları (Electron/production build)
const frontendDist = path.resolve(__dirname, 'public');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA için catch-all: yalnızca /api dışı GET'lere — React Router'ın çalışması için
  app.get(/^(?!\/api)/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

export default app;
