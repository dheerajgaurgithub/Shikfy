import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  profilePic?: string;
  profilePics: string[];
  bannerUrl?: string;
  verified: boolean;
  roles: string[];
  languages: string[];
  themePref: 'light' | 'dark' | 'system';
  closeFriends?: mongoose.Types.ObjectId[];
  privacySettings: {
    showProfileViews: boolean;
    allowAnonymousStoryViews: boolean;
    profileVisibility: 'public' | 'private';
    showFollowersList: boolean;
    showFollowingList: boolean;
  };
  followersCount: number;
  followingCount: number;
  postsCount: number;
  lastUsernameChangeAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true },
  bio: { type: String, default: '' },
  profilePic: { type: String, default: '' },
  profilePics: [{ type: String }],
  bannerUrl: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  roles: [{ type: String, default: 'user' }],
  languages: [{ type: String, default: ['en'] }],
  themePref: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  closeFriends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  privacySettings: {
    showProfileViews: { type: Boolean, default: true },
    allowAnonymousStoryViews: { type: Boolean, default: false },
    profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
    showFollowersList: { type: Boolean, default: true },
    showFollowingList: { type: Boolean, default: true }
  },
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });

export default mongoose.model<IUser>('User', UserSchema);
