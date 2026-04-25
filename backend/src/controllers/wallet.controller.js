import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import vnpay from "../libs/vnpay.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import VnpayTransaction from "../models/VNPayTransaction.js";
import Notification from "../models/Notification.js";
import { ProductCode, VnpLocale, dateFormat } from "vnpay";

// ==================== TẠO URL NẠP TIỀN ====================
// POST /api/wallet/topup
export const createTopup = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount < 10000) {
      return res.status(400).json({
        success: false,
        message: "Số tiền nạp tối thiểu là 10,000 VND",
      });
    }

    if (amount > 50000000) {
      return res.status(400).json({
        success: false,
        message: "Số tiền nạp tối đa là 50,000,000 VND",
      });
    }

    const wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet || wallet.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Ví không tồn tại hoặc đã bị khoá",
      });
    }

    const orderId = `${Date.now()}${uuidv4().slice(0, 6).toUpperCase()}`;

    // Lưu pending transaction
    await VnpayTransaction.create({
      userId:   req.user.id,
      walletId: wallet._id,
      amount,
      orderId,
      status:   "pending",
    });

    // Tạo URL thanh toán bằng thư viện vnpay
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount:      amount,
      vnp_IpAddr:
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket.remoteAddress ||
        "127.0.0.1",
      vnp_TxnRef:      orderId,
      vnp_OrderInfo:   `Nap tien vi SV ${orderId}`,
      vnp_OrderType:   ProductCode.Other,
      vnp_Locale:      VnpLocale.VN,
      vnp_ReturnUrl:   process.env.VNP_RETURN_URL,
      vnp_CreateDate: dateFormat(new Date()),                            // ← sửa
      vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000)), // ← sửa
    });

    return res.status(200).json({
      success: true,
      message: "Tạo link thanh toán thành công",
      data: { paymentUrl, orderId },
    });
  } catch (error) {
    console.error("createTopup error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== RETURN URL ====================
// GET /api/wallet/topup/vnpay-return
export const vnpayReturn = async (req, res) => {
  try {
    const verify = vnpay.verifyReturnUrl(req.query);

    if (!verify.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Chữ ký không hợp lệ",
      });
    }

    if (verify.isSuccess) {
      return res.status(200).json({
        success: true,
        message: "Thanh toán thành công, ví đang được cập nhật",
        data: {
          orderId: verify.vnp_TxnRef,
          amount:  verify.vnp_Amount,
          bankCode: verify.vnp_BankCode,
        },
      });
    } else {
      return res.status(200).json({
        success: false,
        message: `Thanh toán thất bại (mã: ${verify.vnp_ResponseCode})`,
        data: { orderId: verify.vnp_TxnRef },
      });
    }
  } catch (error) {
    console.error("vnpayReturn error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== IPN ====================
// GET /api/wallet/topup/vnpay-ipn
export const vnpayIPN = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const verify = vnpay.verifyIpnCall(req.query);

    if (!verify.isVerified) {
      await session.abortTransaction();
      return res.status(200).json({ RspCode: "97", Message: "Invalid signature" });
    }

    const vnpTxn = await VnpayTransaction.findOne({
      orderId: verify.vnp_TxnRef,
    }).session(session);

    if (!vnpTxn) {
      await session.abortTransaction();
      return res.status(200).json({ RspCode: "01", Message: "Order not found" });
    }

    if (vnpTxn.status !== "pending") {
      await session.abortTransaction();
      return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
    }

    if (vnpTxn.amount !== verify.vnp_Amount) {
      await session.abortTransaction();
      return res.status(200).json({ RspCode: "04", Message: "Invalid amount" });
    }

    const isSuccess = verify.isSuccess;

    vnpTxn.status           = isSuccess ? "success" : "failed";
    vnpTxn.responseCode     = verify.vnp_ResponseCode;
    vnpTxn.bankCode         = verify.vnp_BankCode;
    vnpTxn.vnpTransactionNo = verify.vnp_TransactionNo;
    vnpTxn.payDate          = verify.vnp_PayDate;
    await vnpTxn.save({ session });

    const [transaction] = await Transaction.create(
      [{
        walletId:            vnpTxn.walletId,
        type:                "topup",
        status:              isSuccess ? "success" : "failed",
        method:              "vnpay",
        amount:              verify.vnp_Amount,
        vnpayTransactionId:  vnpTxn._id,
        description:         `Nạp tiền qua VNPay - ${verify.vnp_TxnRef}`,
      }],
      { session }
    );

    if (isSuccess) {
      await Wallet.findByIdAndUpdate(
        vnpTxn.walletId,
        { $inc: { balance: verify.vnp_Amount } },
        { session }
      );

      await Notification.create(
        [{
          userId:    vnpTxn.userId,
          title:     "Nạp tiền thành công",
          message:   `Bạn vừa nạp ${verify.vnp_Amount.toLocaleString("vi-VN")}₫ vào ví qua VNPay`,
          type:      "transaction",
          relatedId: transaction._id,
        }],
        { session }
      );
    }

    await session.commitTransaction();
    return res.status(200).json({ RspCode: "00", Message: "Confirm success" });
  } catch (error) {
    await session.abortTransaction();
    console.error("vnpayIPN error:", error);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  } finally {
    session.endSession();
  }
};

// ==================== XEM SỐ DƯ VÍ ====================
export const getMyWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id }).select("-pin");
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Không tìm thấy ví" });
    }
    return res.status(200).json({ success: true, data: wallet });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== LỊCH SỬ GIAO DỊCH ====================
export const getTransactions = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Không tìm thấy ví" });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({ walletId: wallet._id });

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page:       parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};