import mongoose from "mongoose";

const vnpaySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet"
  },
  amount: Number,
  orderId: {
    type: String,
    unique: true
  },
  vnpTxnRef: String,
  vnpTransactionNo: String,
  status: String,
  responseCode: String,
  bankCode: String,
  payDate: String
}, { timestamps: true });

export default mongoose.model("VnpayTransaction", vnpaySchema);