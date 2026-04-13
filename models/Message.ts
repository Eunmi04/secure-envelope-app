import mongoose, { Schema, Model, models } from 'mongoose'

export interface IMessage {
  senderEmail: string
  receiverEmail: string
  encryptedMessageBase64: string
  encryptedAesKeyBase64: string
  ivBase64: string
  signatureBase64: string
  plainMessageHash: string
  status: 'sent' | 'read'
}

const messageSchema = new Schema<IMessage>(
  {
    senderEmail: { type: String, required: true, index: true },
    receiverEmail: { type: String, required: true, index: true },
    encryptedMessageBase64: { type: String, required: true },
    encryptedAesKeyBase64: { type: String, required: true },
    ivBase64: { type: String, required: true },
    signatureBase64: { type: String, required: true },
    plainMessageHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'read'],
      default: 'sent',
    },
  },
  { timestamps: true }
)

const Message: Model<IMessage> =
  models.Message || mongoose.model<IMessage>('Message', messageSchema)

export default Message