import "dotenv/config";
import express from "express";
import { connectDB } from "./libs/db.js";
import authRoutes from "./routes/auth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import transferRoutes from "./routes/Transfer.routes.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transfer", transferRoutes);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server start on PORT ${PORT}`);
  });
});