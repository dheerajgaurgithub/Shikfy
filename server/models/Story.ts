import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  authorId: mongoose.Types.ObjectId;
  media: {
    type: 'image' | 'video';
    url: string;
  };
  viewers: mongoose.Types.ObjectId[];
  anonymousViewAllowed: boolean;
  viewersCount: number;
  expiresAt: Date;
  createdAt: Date;
}

const StorySchema: Schema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  media: {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true }
  },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  anonymousViewAllowed: { type: Boolean, default: false },
  viewersCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

StorySchema.index({ authorId: 1, expiresAt: 1 });
StorySchema.index({ expiresAt: 1 });

export default mongoose.model<IStory>('Story', StorySchema);
