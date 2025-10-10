import mongoose, { Schema, Document } from 'mongoose';

export interface IHub extends Document {
  name: string;
  slug: string;
  description?: string;
  cover?: string;
  ownerId: mongoose.Types.ObjectId;
  moderators: mongoose.Types.ObjectId[];
  membersCount: number;
  createdAt: Date;
}

const HubSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '' },
  cover: { type: String, default: '' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  membersCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model<IHub>('Hub', HubSchema);
