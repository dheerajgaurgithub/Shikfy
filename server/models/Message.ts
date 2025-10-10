import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  type?: 'text' | 'call';
  call?: {
    direction: 'incoming'|'outgoing';
    media: 'audio'|'video';
    status: 'missed'|'rejected'|'completed';
    durationMs?: number;
  };
  attachments: {
    type: 'image' | 'video' | 'file';
    url: string;
    name?: string;
  }[];
  scheduledAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
  deletedFor?: mongoose.Types.ObjectId[];
  replyToMessageId?: mongoose.Types.ObjectId;
  reactions?: { emoji: string; userId: mongoose.Types.ObjectId }[];
  status: 'sent' | 'delivered' | 'read' | 'scheduled';
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  type: { type: String, enum: ['text','call'], default: 'text' },
  call: {
    direction: { type: String, enum: ['incoming','outgoing'] },
    media: { type: String, enum: ['audio','video'] },
    status: { type: String, enum: ['missed','rejected','completed'] },
    durationMs: { type: Number }
  },
  attachments: [{
    type: { type: String, enum: ['image', 'video', 'file'] },
    url: { type: String, required: true },
    name: { type: String }
  }],
  scheduledAt: { type: Date },
  editedAt: { type: Date },
  deletedAt: { type: Date },
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replyToMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  reactions: [{
    emoji: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'scheduled'],
    default: 'sent'
  },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ scheduledAt: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
