import jwt from "jsonwebtoken";

// Kiểm tra đăng nhập
export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Bạn cần đăng nhập để thực hiện thao tác này",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, isVerified }
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
};

// Kiểm tra đã xác thực sinh viên (dùng cho thanh toán nội bộ)
export const studentOnly = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Bạn cần xác thực mã số sinh viên để sử dụng tính năng này",
    });
  }
  next();
};

// Kiểm tra quyền admin
export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền thực hiện thao tác này",
    });
  }
  next();
};