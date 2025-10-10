import mongoose, { Schema, Document } from 'mongoose';

export interface IProfileView extends Document {
  viewerId: mongoose.Types.ObjectId;
  viewedUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ProfileViewSchema: Schema = new Schema({
  viewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  viewedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

ProfileViewSchema.index({ viewedUserId: 1, createdAt: -1 });
ProfileViewSchema.index({ viewerId: 1, viewedUserId: 1, createdAt: -1 });

export default mongoose.model<IProfileView>('ProfileView', ProfileViewSchema);
