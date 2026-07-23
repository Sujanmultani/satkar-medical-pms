const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use Google/Cloudflare public DNS to resolve MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  console.log('[Satkar DB Warning] Could not override custom DNS servers:', e.message);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/satkar_medical',
      {
        serverSelectionTimeoutMS: 10000,
      }
    );
    console.log(`[Satkar DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Satkar DB Error] ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
