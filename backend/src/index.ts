import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware as auth } from './middleware/auth';
import { auditLogMiddleware } from './middleware/auditLog';

// Routes
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import reportRoutes from './routes/reports';
import budgetRoutes from './routes/budgets';
import pivotRoutes from './routes/pivot';
import analyticsRoutes from './routes/analytics';
import aiRoutes from './routes/ai';
import importRoutes from './routes/import';
import auditLogRoutes from './routes/auditLogs';
import companyRoutes from './routes/companies';
import invoiceRoutes from './routes/invoices';
import gstRoutes from './routes/gst';
import bankRecoRoutes from './routes/bankReco';
import balanceSheetRoutes from './routes/balanceSheet';
import memberRoutes from './routes/members';

const app = express();

// Middleware
app.use(cors({ 
  origin: config.corsOrigin, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie']
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/transactions', auth, auditLogMiddleware('Transactions'), transactionRoutes);
app.use('/api/v1/reports', auth, reportRoutes);
app.use('/api/v1/budgets', auth, auditLogMiddleware('Budgets'), budgetRoutes);
app.use('/api/v1/pivot', auth, pivotRoutes);
app.use('/api/v1/analytics', auth, analyticsRoutes);
app.use('/api/v1/ai', auth, aiRoutes);
app.use('/api/v1/import', auth, importRoutes);
app.use('/api/v1/audit-logs', auth, auditLogRoutes);
app.use('/api/v1/invoices', auth, auditLogMiddleware('Invoices'), invoiceRoutes);
app.use('/api/v1/gst', auth, gstRoutes);
app.use('/api/v1/bank-reco', auth, bankRecoRoutes);
app.use('/api/v1/balance-sheet', auth, balanceSheetRoutes);
app.use('/api/v1/members', auth, memberRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ MongoDB connected');

    app.listen(config.port, () => {
      console.log(`🚀 FinLedger Pro API running on port ${config.port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
