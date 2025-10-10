import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  authorId: mongoose.Types.ObjectId;
  media: { type: 'image' | 'video'; url: string };
  // overlays
  template?: 'none' | 'gradient' | 'vignette';
  text?: { content: string; color: string; y: number };
  // interactive stickers (P0 minimal: poll)
  poll?: { question: string; options: string[]; votes: { userId: mongoose.Types.ObjectId; optionIndex: number }[] };
  // reactions (quick emojis)
  reactions?: { userId: mongoose.Types.ObjectId; emoji: string; createdAt: Date }[];
  // visibility
  visibility?: 'all' | 'close_friends' | 'custom';
  audienceIds?: mongoose.Types.ObjectId[];
  batchId?: string; // slides created together
  viewers: mongoose.Types.ObjectId[];
  anonymousViewAllowed: boolean;
  viewersCount: number;
  expiresAt: Date;
  archived?: boolean;
  highlightId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const StorySchema: Schema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  media: {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true }
  },
  template: { type: String, enum: ['none','gradient','vignette'], default: 'none' },
  text: {
    content: { type: String },
    color: { type: String, default: '#ffffff' },
    y: { type: Number, default: 85 }
  },
  poll: {
    question: { type: String },
    options: [{ type: String }],
    votes: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, optionIndex: Number }]
  },
  reactions: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, emoji: String, createdAt: { type: Date, default: Date.now } }],
  visibility: { type: String, enum: ['all','close_friends','custom'], default: 'all' },
  audienceIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  batchId: { type: String },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  anonymousViewAllowed: { type: Boolean, default: false },
  viewersCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  archived: { type: Boolean, default: false },
  highlightId: { type: Schema.Types.ObjectId, ref: 'Highlight', default: null }
}, {
  timestamps: true
});

StorySchema.index({ authorId: 1, expiresAt: 1 });
StorySchema.index({ expiresAt: 1 });
StorySchema.index({ batchId: 1 });

export default mongoose.model<IStory>('Story', StorySchema);
