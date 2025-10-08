import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shikfy';

export const connectDatabase = async () => {
  try {
    // Safe visibility for debugging without leaking secrets
    const isSrv = MONGODB_URI.startsWith('mongodb+srv://');
    console.log(`Connecting to MongoDB: ${isSrv ? 'Atlas SRV' : MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
