import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log("Ket noi DB thanh cong!!!")
    } catch (error) {
        console.log("Fail to connect to DB", error);
        process.exit(1);
    }
}