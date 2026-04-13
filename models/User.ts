import mongoose, { Schema, Model, models } from 'mongoose'

export interface IUser {
  name: string
  email: string
  image?: string
  provider?: string
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    provider: { type: String },
  },
  { timestamps: true }
)

const User: Model<IUser> = models.User || mongoose.model<IUser>('User', userSchema)

export default User