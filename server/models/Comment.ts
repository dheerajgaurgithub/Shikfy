import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  postId?: mongoose.Types.ObjectId;
  reelId?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  text: string;
  parentCommentId?: mongoose.Types.ObjectId;
  likesCount: number;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'Post' },
  reelId: { type: Schema.Types.ObjectId, ref: 'Reel' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  likesCount: { type: Number, default: 0 },
  editedAt: { type: Date }
}, {
  timestamps: true
});

CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ reelId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
