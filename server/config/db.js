const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/satkar_medical';
  const localUri = 'mongodb://127.0.0.1:27017/satkar_medical';

  const options = {
    serverSelectionTimeoutMS: 10000,
    family: 4,
  };

  try {
    const conn = await mongoose.connect(mongoUri, options);
    console.log(`[Satkar DB] MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (error) {
    console.error(`[Satkar DB Error] Primary DB connection failed: ${error.message}`);
    
    // Try fallback to local MongoDB if primary Atlas connection fails
    if (mongoUri !== localUri) {
      try {
        console.log(`[Satkar DB] Trying fallback to local MongoDB (${localUri})...`);
        const localConn = await mongoose.connect(localUri, options);
        console.log(`[Satkar DB] Connected to local MongoDB: ${localConn.connection.host}`);
        return;
      } catch (localErr) {
        console.error(`[Satkar DB Error] Local fallback also failed: ${localErr.message}`);
      }
    }

    // Keep backend server alive and retry in background
    console.log('[Satkar DB] Server remaining active. Retrying database connection in 10 seconds...');
    setTimeout(connectDB, 10000);
  }
};

module.exports = connectDB;
