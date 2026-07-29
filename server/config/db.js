const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use Google & Cloudflare Public DNS to resolve MongoDB Atlas SRV records instantly
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  console.log('[Satkar DB Warning] Custom DNS override not available:', e.message);
}

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/satkar_medical';

  const options = {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    family: 4,
  };

  try {
    const conn = await mongoose.connect(mongoUri, options);
    console.log(`[Satkar DB] MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (error) {
    console.error(`[Satkar DB Error] Primary Atlas DB connection failed: ${error.message}`);
    console.log('[Satkar DB] Retrying primary Atlas database connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
