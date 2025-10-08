import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  type: 'dm' | 'group';
  members: mongoose.Types.ObjectId[];
  name?: string;
  lastMessageId?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema: Schema = new Schema({
  type: { type: String, enum: ['dm', 'group'], required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  name: { type: String },
  lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

ChatSchema.index({ members: 1 });
ChatSchema.index({ lastMessageAt: -1 });

export default mongoose.model<IChat>('Chat', ChatSchema);
