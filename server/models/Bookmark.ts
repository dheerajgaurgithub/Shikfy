import mongoose, { Schema, Document } from 'mongoose';

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  targetType: 'post' | 'reel';
  createdAt: Date;
}

const BookmarkSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['post', 'reel'], required: true }
}, {
  timestamps: true
});

BookmarkSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
