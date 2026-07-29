const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes.js');
const itemRoutes = require('./routes/itemRoutes.js');
const batchRoutes = require('./routes/batchRoutes.js');
const invoiceRoutes = require('./routes/invoiceRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
const billRoutes = require('./routes/billRoutes.js');
const settingsRoutes = require('./routes/settingsRoutes.js');
const returnRoutes = require('./routes/returnRoutes.js');
const supplierRoutes = require('./routes/supplierRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const { startExpiryCron } = require('./jobs/expiryStatusJob.js');
const { startQuarterlyBackupCron } = require('./jobs/quarterlyBackupJob.js');
const { errorHandler, notFound } = require('./middleware/errorMiddleware.js');

dotenv.config();

// Connect to MongoDB & start background jobs
connectDB().then(() => {
  startExpiryCron();
  startQuarterlyBackupCron();
});

const app = express();

// HTTP Security Headers
app.use(helmet({ contentSecurityPolicy: false }));

// Cross-Origin Resource Sharing locked to CLIENT_URL
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parser with 100MB limit for large high-resolution invoice photos
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// NoSQL Operator Injection Sanitization Middleware
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach((key) => {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    };
    sanitize(req.body);
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Satkar Medical API' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[Process Warning] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err.message);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Satkar Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://0.0.0.0:${PORT}`);
});
