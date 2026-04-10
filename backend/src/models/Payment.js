import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service"
  },
  transactionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Transaction",
  default: null
  },
  amount: Number,
  status: {
    type: String,
    enum: ["unpaid", "paid", "overdue", "cancelled"],
    default: "unpaid"
  },
  dueDate: Date,
  paidAt: Date
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model("Payment", paymentSchema);