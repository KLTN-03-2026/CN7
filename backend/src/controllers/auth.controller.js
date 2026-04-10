import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, isVerified: user.isVerified },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// ==================== ĐĂNG KÝ ====================
export const register = async (req, res) => {
  try {
    const { phone, password, fullName, email } = req.body;

    // Validate input
    if (!phone || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ họ tên, số điện thoại và mật khẩu",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // Kiểm tra phone trùng
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: "Số điện thoại đã được đăng ký",
      });
    }

    // Kiểm tra email trùng (nếu có nhập)
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email đã được đăng ký",
        });
      }
    }

    // Tạo user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      phone,
      password: hashedPassword,
      fullName,
      email: email || null,
      isVerified: false, // chưa xác thực sinh viên
    });

    // Tự động tạo ví
    await Wallet.create({ userId: user._id });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    console.error("register error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== ĐĂNG NHẬP ====================
export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số điện thoại và mật khẩu",
      });
    }

    // Tìm user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Kiểm tra tài khoản bị khoá
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị khoá. Vui lòng liên hệ nhà trường",
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          studentId: user.studentId,
          role: user.role,
          isVerified: user.isVerified,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== XÁC THỰC SINH VIÊN ====================
export const verifyStudent = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã số sinh viên",
      });
    }

    // Kiểm tra MSSV đã được dùng bởi tài khoản khác chưa
    const existingStudent = await User.findOne({ studentId });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Mã số sinh viên đã được liên kết với tài khoản khác",
      });
    }

    // Cập nhật user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { studentId, isVerified: true },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Xác thực sinh viên thành công",
      data: {
        id: user._id,
        fullName: user.fullName,
        studentId: user.studentId,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("verifyStudent error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ==================== LẤY THÔNG TIN BẢN THÂN ====================
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};