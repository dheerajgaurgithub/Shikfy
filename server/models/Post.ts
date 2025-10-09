import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  authorId: mongoose.Types.ObjectId;
  caption?: string;
  media: Array<{
    url: string;
    type: 'image' | 'video';
    thumbnail?: string;
    meta?: any;
  }>;
  location?: string;
  visibility?: 'public' | 'followers' | 'mutuals' | 'custom' | 'close_friends';
  allowList?: mongoose.Types.ObjectId[];
  excludeList?: mongoose.Types.ObjectId[];
  status?: 'published' | 'scheduled' | 'draft';
  scheduledAt?: Date;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  hashtags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, default: '' },
  media: [{
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    thumbnail: { type: String },
    meta: { type: Schema.Types.Mixed }
  }],
  location: { type: String },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'mutuals', 'custom', 'close_friends'],
    default: 'public'
  },
  allowList: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  excludeList: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['published', 'scheduled', 'draft'], default: 'published' },
  scheduledAt: { type: Date },
  likesCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  hashtags: [{ type: String }]
}, {
  timestamps: true
});

PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ createdAt: -1 });

export default mongoose.model<IPost>('Post', PostSchema);
