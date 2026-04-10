import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true 
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: "VND"
  },
  pin : {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: "active"
  }
}, { timestamps: true });

export default mongoose.model("Wallet", walletSchema);