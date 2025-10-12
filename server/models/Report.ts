import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  type: 'account' | 'post' | 'reel';
  targetId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: 'open' | 'resolved';
  resolution?: string;
  resolvedBy?: mongoose.Types.ObjectId | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema({
  type: { type: String, enum: ['account', 'post', 'reel'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  details: { type: String },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  resolution: { type: String },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date }
}, { timestamps: true });

ReportSchema.index({ type: 1, status: 1, createdAt: -1 });

export default mongoose.model<IReport>('Report', ReportSchema);
