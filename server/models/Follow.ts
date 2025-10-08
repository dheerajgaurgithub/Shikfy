import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
  followerId: mongoose.Types.ObjectId;
  followingId: mongoose.Types.ObjectId;
  blocked: boolean;
  blockKeepsFollow: boolean;
  createdAt: Date;
}

const FollowSchema: Schema = new Schema({
  followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: Boolean, default: false },
  blockKeepsFollow: { type: Boolean, default: false }
}, {
  timestamps: true
});

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
FollowSchema.index({ followerId: 1 });
FollowSchema.index({ followingId: 1 });

export default mongoose.model<IFollow>('Follow', FollowSchema);
