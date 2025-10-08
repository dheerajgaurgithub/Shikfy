import mongoose, { Schema, Document } from 'mongoose';

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  targetType: 'post' | 'reel' | 'comment';
  createdAt: Date;
}

const LikeSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['post', 'reel', 'comment'], required: true }
}, {
  timestamps: true
});

LikeSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
LikeSchema.index({ targetId: 1, targetType: 1 });

export default mongoose.model<ILike>('Like', LikeSchema);
