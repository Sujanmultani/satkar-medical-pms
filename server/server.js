const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const authRoutes = require('./routes/authRoutes.js');
const itemRoutes = require('./routes/itemRoutes.js');
const batchRoutes = require('./routes/batchRoutes.js');
const invoiceRoutes = require('./routes/invoiceRoutes.js');
const { errorHandler, notFound } = require('./middleware/errorMiddleware.js');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Satkar Medical API' });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Satkar Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
