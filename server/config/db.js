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
  const localUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/satkar_medical';

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
    console.error(`[Satkar DB Error] Primary Atlas DB connection failed (${error.message}). Trying local DB fallback...`);
    
    if (mongoUri !== localUri) {
      try {
        const localConn = await mongoose.connect(localUri, options);
        console.log(`[Satkar DB] Connected to Local MongoDB: ${localConn.connection.host}`);
        return;
      } catch (localErr) {
        console.error(`[Satkar DB Error] Local DB fallback failed: ${localErr.message}`);
      }
    }

    // Auto-retry connection in background after 5s
    console.log('[Satkar DB] Retrying database connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
