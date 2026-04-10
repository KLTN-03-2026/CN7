import express from "express";
import dotenv from "dotenv"
import { connectDB } from "./libs/db.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001

app.use(express.json());

//routes
app.use("/api/auth", authRoutes);

connectDB().then(() => {
    app.listen(PORT, () =>{
        console.log(`Server start on PORT ${PORT} `);
    }); 
});
 