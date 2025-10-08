import mongoose, { Schema, Document } from 'mongoose';

export interface IReel extends Document {
  authorId: mongoose.Types.ObjectId;
  caption: string;
  video: {
    url: string;
    thumbnail: string;
    duration: number;
  };
  audio?: {
    url: string;
    name: string;
    allowDownload: boolean;
  };
  location?: string;
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  viewsCount: number;
  hashtags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReelSchema: Schema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, default: '' },
  video: {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    duration: { type: Number, required: true }
  },
  audio: {
    url: { type: String },
    name: { type: String },
    allowDownload: { type: Boolean, default: false }
  },
  location: { type: String },
  likesCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  hashtags: [{ type: String }]
}, {
  timestamps: true
});

ReelSchema.index({ authorId: 1, createdAt: -1 });
ReelSchema.index({ hashtags: 1 });
ReelSchema.index({ createdAt: -1 });

export default mongoose.model<IReel>('Reel', ReelSchema);
