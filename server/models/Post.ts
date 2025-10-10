import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  authorId: mongoose.Types.ObjectId;
  caption?: string;
  richContent?: string; // markdown or serialized blocks
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
  coAuthors?: mongoose.Types.ObjectId[];
  poll?: {
    question: string;
    options: Array<{ id: string; text: string; count: number }>;
    expiresAt?: Date;
  };
  hubId?: mongoose.Types.ObjectId;
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
  richContent: { type: String, default: '' },
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
  coAuthors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  poll: {
    question: { type: String },
    options: [{ id: { type: String }, text: { type: String }, count: { type: Number, default: 0 } }],
    expiresAt: { type: Date }
  },
  hubId: { type: Schema.Types.ObjectId, ref: 'Hub' },
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
PostSchema.index({ caption: 'text', richContent: 'text' });

export default mongoose.model<IPost>('Post', PostSchema);
