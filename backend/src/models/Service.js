import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  name: String,
  price: {
    type: Number,
    default: 0
  },
  description: String,
  type: {
    type: String,
    enum: ["tuition", "parking", "library", "other"],
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model("Service", serviceSchema);