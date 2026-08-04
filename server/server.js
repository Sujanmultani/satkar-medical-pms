const express = require('express');
const cors = require('cors');
let helmet;
try {
  helmet = require('helmet');
} catch (e) {
  helmet = null;
}
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
const { verifyEmailTransporter } = require('./services/emailService.js');
const { errorHandler, notFound } = require('./middleware/errorMiddleware.js');

dotenv.config();

console.log('========================================');
console.log('EMAIL CONFIG CHECK:');
console.log('EMAIL_USER:', (process.env.EMAIL_USER || process.env.GMAIL_USER) ? 'SET' : 'MISSING');
console.log('EMAIL_PASS:', (process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD) ? 'SET' : 'MISSING');
console.log('ADMIN_NOTIFICATION_EMAIL:', process.env.ADMIN_NOTIFICATION_EMAIL || '(using fallback default)');
console.log('========================================');

// Connect to MongoDB & start background jobs
connectDB().then(() => {
  startExpiryCron();
  startQuarterlyBackupCron();
  verifyEmailTransporter();
});

const app = express();

// Temporary request logging to diagnose route handling in production
app.use((req, res, next) => {
  console.log(`[REQUEST LOG] ${req.method} ${req.originalUrl}`);
  next();
});

// HTTP Security Headers
if (helmet) {
  app.use(helmet({ contentSecurityPolicy: false }));
}

// Cross-Origin Resource Sharing allowing local network IPs & CLIENT_URL
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      process.env.CLIENT_URL === origin ||
      /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Body parser with 50MB limit for high-resolution multi-page invoice photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
