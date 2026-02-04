import mongoose from 'mongoose';

const chatReportSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

chatReportSchema.index({ chatId: 1, createdAt: -1 });

const ChatReport = mongoose.model('ChatReport', chatReportSchema);

export default ChatReport;
