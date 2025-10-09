import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shikfy';

export const connectDatabase = async () => {
  const isSrv = MONGODB_URI.startsWith('mongodb+srv://');
  const redacted = MONGODB_URI.replace(/:\/\/[^:]+:[^@]+@/, '://<user>:<password>@');

  // Retry with backoff to handle cold clusters or IP propagation delays
  const maxAttempts = 5;
  const baseDelayMs = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Connecting to MongoDB (${isSrv ? 'Atlas SRV' : 'Standalone'}) [attempt ${attempt}/${maxAttempts}] -> ${redacted}`);
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 12000,
        socketTimeoutMS: 20000,
        family: 4,
      } as any);
      console.log('✅ MongoDB connected successfully');
      break;
    } catch (error: any) {
      console.error(`❌ MongoDB connection error (attempt ${attempt}):`, error?.message || error);
      if (attempt === maxAttempts) {
        console.error('Exceeded max connection attempts. Exiting.');
        process.exit(1);
      }
      const delay = baseDelayMs * attempt;
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
