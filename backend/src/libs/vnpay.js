import { VNPay, ignoreLogger } from "vnpay";

const vnpay = new VNPay({
  tmnCode:       process.env.VNP_TMN_CODE,
  secureSecret:  process.env.VNP_HASH_SECRET,
  vnpayHost:     "https://sandbox.vnpayment.vn",
  testMode:      true,   // bỏ dòng này khi lên production
  enableLog:     false,
  loggerFn:      ignoreLogger,
});

export default vnpay;