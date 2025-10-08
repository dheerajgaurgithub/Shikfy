import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'story_view';
  fromUserId: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  reelId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  payload: any;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'mention', 'story_view'],
    required: true
  },
  fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post' },
  reelId: { type: Schema.Types.ObjectId, ref: 'Reel' },
  commentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  payload: { type: Schema.Types.Mixed },
  readAt: { type: Date }
}, {
  timestamps: true
});

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ readAt: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
