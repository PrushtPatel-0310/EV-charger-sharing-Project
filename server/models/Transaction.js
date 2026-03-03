import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    category: { type: String, enum: ['Recharge', 'Booking', 'Refund', 'Withdrawal'], required: true },
    status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Success' },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
