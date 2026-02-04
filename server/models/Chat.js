import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    renterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chargerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    chatType: { type: String, enum: ['ENQUIRY', 'BOOKED'], default: 'ENQUIRY' },
    lastMessage: {
      text: { type: String, default: '' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      senderRole: { type: String, enum: ['RENTER', 'OWNER'] },
      at: { type: Date },
      isReadByOwner: { type: Boolean, default: false },
      isReadByRenter: { type: Boolean, default: false },
    },
    unreadForOwner: { type: Number, default: 0 },
    unreadForRenter: { type: Number, default: 0 },
    reported: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatSchema.index({ renterId: 1, ownerId: 1, chargerId: 1 }, { unique: true });
chatSchema.index({ ownerId: 1, updatedAt: -1 });
chatSchema.index({ renterId: 1, updatedAt: -1 });
chatSchema.index({ chatType: 1 });
chatSchema.index({ bookingId: 1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
