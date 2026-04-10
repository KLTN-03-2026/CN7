import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  month: Number,
  year: Number,
  totalExpense: Number,
  suggestion: String
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model("ExpenseAnalytics", expenseSchema);