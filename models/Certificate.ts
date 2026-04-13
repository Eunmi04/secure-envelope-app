import mongoose, { Schema, Model, models } from 'mongoose'

export interface ICertificate {
  userEmail: string
  subject: string
  issuer: string
  serialNumber: string
  signPublicKeyJwk: Record<string, unknown>
  encPublicKeyJwk: Record<string, unknown>
  certificateJson: string
  signature: string
  issuedAt: Date
  expiresAt: Date
  status: 'valid' | 'revoked'
}

const certificateSchema = new Schema<ICertificate>(
  {
    userEmail: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    issuer: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true },
    signPublicKeyJwk: { type: Schema.Types.Mixed, required: true },
    encPublicKeyJwk: { type: Schema.Types.Mixed, required: true },
    certificateJson: { type: String, required: true },
    signature: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['valid', 'revoked'],
      default: 'valid',
    },
  },
  { timestamps: true }
)

const Certificate: Model<ICertificate> =
  models.Certificate ||
  mongoose.model<ICertificate>('Certificate', certificateSchema)

export default Certificate