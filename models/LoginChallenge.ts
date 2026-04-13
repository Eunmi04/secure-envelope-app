import mongoose, { Schema, Model, models } from 'mongoose'

export interface ILoginChallenge {
  userEmail: string
  nonce: string
  expiresAt: Date
  used: boolean
}

const loginChallengeSchema = new Schema<ILoginChallenge>(
  {
    userEmail: { type: String, required: true, index: true },
    nonce: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const LoginChallenge: Model<ILoginChallenge> =
  models.LoginChallenge ||
  mongoose.model<ILoginChallenge>('LoginChallenge', loginChallengeSchema)

export default LoginChallenge