const mongoose = require('mongoose');
const dns = require('dns');

// Configure Node.js DNS resolution order for MongoDB Atlas SRV records
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignore if not supported in node version
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/satkar_medical',
      {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      }
    );
    console.log(`[Satkar DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Satkar DB Error] Initial connection failed: ${error.message}. Attempting DNS fallback...`);
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      const conn = await mongoose.connect(
        process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/satkar_medical',
        {
          serverSelectionTimeoutMS: 15000,
        }
      );
      console.log(`[Satkar DB] MongoDB Connected (DNS Fallback): ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`[Satkar DB Error] Fallback connection failed: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
