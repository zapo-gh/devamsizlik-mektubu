import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { config } from './modules/shared/config';
import { errorHandler } from './modules/shared/middleware/errorHandler.middleware';
import authRoutes from './modules/auth/auth.routes';
import studentRoutes from './modules/students/students.routes';
import absenteeismRoutes from './modules/absenteeism/absenteeism.routes';
import otpRoutes from './modules/otp/otp.routes';

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Global middleware
const corsOrigins = config.corsOrigin.split(',').map(o => o.trim());
app.use(cors({ 
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins, 
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/absenteeism', absenteeismRoutes);
app.use('/api/otp', otpRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
