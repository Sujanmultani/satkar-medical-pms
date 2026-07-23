const express = require('express');
const cors = require('cors');
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
const { startExpiryCron } = require('./jobs/expiryStatusJob.js');
const { errorHandler, notFound } = require('./middleware/errorMiddleware.js');

dotenv.config();

// Connect to MongoDB & start background jobs
connectDB().then(() => {
  startExpiryCron();
});

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

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

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Satkar Medical API' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Satkar Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://0.0.0.0:${PORT}`);
});
