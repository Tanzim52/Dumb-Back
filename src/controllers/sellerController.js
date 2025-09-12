const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Seller = require("../models/seller");
const Otp = require("../models/Otp");
const transporter = require("../config/mailer");
const {
  generateNumericOtp,
  otpEmailHtml,
  hashOtp,
} = require("../utils/generateOtp");
const Product = require("../models/product"); // ensure Product has seller field
const Order = require("../models/order"); // used for seller earnings/orders

// Helper: sign seller token (role included)
function signSellerToken(seller) {
  return jwt.sign({ id: seller._id, role: "seller" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// -------------------- Register & Verify --------------------
const registerSeller = async (req, res, next) => {
  try {
    // validation handled by validateRequest
    const { email, phone } = req.body;

    // prevent duplicate
    const exists = await Seller.findOne({ $or: [{ email }, { phone }] });
    if (exists)
      return res
        .status(409)
        .json({ success: false, message: "Email or phone already registered" });

    const payload = { ...req.body, emailVerified: false, status: "pending" };
    const seller = await Seller.create(payload);

    // create OTP for email verification
    const code = generateNumericOtp(6);
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.updateMany(
      { email, purpose: "seller_register_email", used: false },
      { $set: { used: true } }
    );
    await Otp.create({
      email,
      purpose: "seller_register_email",
      codeHash,
      expiresAt,
      payload: { sellerId: seller._id },
    });

    // send email (non-blocking)
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: "Verify your seller account",
        html: otpEmailHtml({
          fullName: seller.ownerName || seller.businessName,
          code,
        }),
      });
    } catch (e) {
      /* ignore but log if needed */
    }

    res.status(201).json({
      success: true,
      message:
        "Seller created. Verification OTP sent to email. Admin approval required after verification.",
      data: { sellerId: seller._id },
    });
  } catch (err) {
    next(err);
  }
};

const verifySellerEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const record = await Otp.findOne({
      email,
      purpose: "seller_register_email",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!record)
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not found" });
    if (record.attempts >= 5)
      return res
        .status(429)
        .json({ success: false, message: "Too many attempts" });

    if (hashOtp(otp) !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    record.used = true;
    await record.save();

    const sellerId = record.payload?.sellerId;
    if (!sellerId)
      return res
        .status(400)
        .json({ success: false, message: "Missing payload" });

    const seller = await Seller.findByIdAndUpdate(
      sellerId,
      { emailVerified: true },
      { new: true }
    ).select("-password");
    if (!seller)
      return res
        .status(404)
        .json({ success: false, message: "Seller not found" });

    const token = signSellerToken(seller);
    res.json({
      success: true,
      message: "Email verified",
      data: { seller, token },
    });
  } catch (err) {
    next(err);
  }
};

// -------------------- Login --------------------
const loginSeller = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ email }).select("+password");
    if (!seller)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const ok = await seller.matchPassword(password);
    if (!ok)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    if (!seller.emailVerified)
      return res
        .status(403)
        .json({ success: false, message: "Please verify your email" });

    if (seller.status !== "approved")
      return res
        .status(403)
        .json({
          success: false,
          message: `Account not approved (status: ${seller.status})`,
        });

    const token = signSellerToken(seller);
    const { password: _, ...safe } = seller.toObject();
    res.json({ success: true, data: { seller: safe, token } });
  } catch (err) {
    next(err);
  }
};

// -------------------- Forgot Password (OTP) --------------------
const forgotPasswordStart = async (req, res, next) => {
  try {
    const { email } = req.body;
    const seller = await Seller.findOne({ email });
    if (!seller)
      return res
        .status(400)
        .json({ success: false, message: "No seller with that email" });

    const code = generateNumericOtp(6);
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.updateMany(
      { email, purpose: "seller_forgot_password", used: false },
      { $set: { used: true } }
    );
    await Otp.create({
      email,
      purpose: "seller_forgot_password",
      codeHash,
      expiresAt,
      payload: { sellerId: seller._id },
    });

    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: "Reset your seller password",
        html: otpEmailHtml({
          fullName: seller.ownerName || seller.businessName,
          code,
        }),
      });
    } catch (e) {}

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    next(err);
  }
};

const forgotPasswordVerify = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const record = await Otp.findOne({
      email,
      purpose: "seller_forgot_password",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!record)
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not found" });
    if (record.attempts >= 5)
      return res
        .status(429)
        .json({ success: false, message: "Too many attempts" });

    if (hashOtp(otp) !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    record.used = true;
    await record.save();
    const sellerId = record.payload?.sellerId;
    if (!sellerId)
      return res
        .status(400)
        .json({ success: false, message: "Missing payload" });

    const seller = await Seller.findById(sellerId);
    seller.password = newPassword;
    await seller.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
};

// -------------------- Seller authenticated endpoints --------------------
const getMe = async (req, res, next) => {
  try {
    // req.seller set by sellerAuth
    const seller = req.seller;
    res.json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const allowed = [
      "businessName",
      "ownerName",
      "address",
      "bankDetails",
      "documents",
      "logoUrl",
      "paymentMethod",
      "meta",
    ];
    allowed.forEach((f) => {
      if (f in req.body) {
      } else {
      }
    }); // just for clarity

    // prevent changing email/phone/status/password via this route
    ["email", "phone", "password", "status", "isActive"].forEach(
      (f) => delete req.body[f]
    );

    const updated = await Seller.findByIdAndUpdate(req.seller._id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const seller = await Seller.findById(req.seller._id).select("+password");
    const ok = await seller.matchPassword(currentPassword);
    if (!ok)
      return res
        .status(400)
        .json({ success: false, message: "Current password incorrect" });

    seller.password = newPassword;
    await seller.save();
    res.json({ success: true, message: "Password changed" });
  } catch (err) {
    next(err);
  }
};

// -------------------- Change email (OTP) --------------------
const changeEmailStart = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail)
      return res
        .status(400)
        .json({ success: false, message: "newEmail required" });

    const exists = await Seller.findOne({ email: newEmail });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });

    const code = generateNumericOtp(6);
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.updateMany(
      { email: newEmail, purpose: "seller_change_email", used: false },
      { $set: { used: true } }
    );
    await Otp.create({
      email: newEmail,
      purpose: "seller_change_email",
      codeHash,
      expiresAt,
      payload: { sellerId: req.seller._id },
    });

    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: newEmail,
        subject: "Confirm your new seller email",
        html: otpEmailHtml({
          fullName: req.seller.ownerName || req.seller.businessName,
          code,
        }),
      });
    } catch (e) {}

    res.json({ success: true, message: "OTP sent to new email" });
  } catch (err) {
    next(err);
  }
};

const changeEmailVerify = async (req, res, next) => {
  try {
    const { newEmail, otp } = req.body;
    const record = await Otp.findOne({
      email: newEmail,
      purpose: "seller_change_email",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    if (!record)
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not found" });
    if (record.attempts >= 5)
      return res
        .status(429)
        .json({ success: false, message: "Too many attempts" });

    if (hashOtp(otp) !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    record.used = true;
    await record.save();
    const payloadSellerId = record.payload?.sellerId;
    if (
      !payloadSellerId ||
      String(payloadSellerId) !== String(req.seller._id)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP payload" });
    }

    const updated = await Seller.findByIdAndUpdate(
      req.seller._id,
      { email: newEmail, emailVerified: true },
      { new: true }
    ).select("-password");
    const token = signSellerToken(updated);
    res.json({
      success: true,
      message: "Email changed",
      data: { seller: updated, token },
    });
  } catch (err) {
    next(err);
  }
};

// -------------------- File upload (documents/logo) --------------------
const uploadDocuments = async (req, res, next) => {
  try {
    // multer stored file(s) in req.file or req.files
    // Expects fields: 'businessLicense' and/or 'idCard' etc. You can adjust frontend to use these names.
    const updates = {};
    if (req.file) {
      // single file upload -> assume fieldName provided by frontend, otherwise fallback to generic
      // multer will set req.file.fieldname
      const key = req.file.fieldname || "document";
      // Save path relative to server root -> choose URL mapping as you prefer
      updates[`documents.${key}Url`] = `/uploads/sellers/${req.file.filename}`; // frontend should prefix host
    }
    // for multiple files use req.files and map accordingly
    if (Object.keys(updates).length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });

    const updated = await Seller.findByIdAndUpdate(
      req.seller._id,
      { $set: updates },
      { new: true }
    ).select("-password");
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// -------------------- Admin & common operations --------------------
const listSellers = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q)
      filter.$or = [
        { businessName: new RegExp(q, "i") },
        { ownerName: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
      ];

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Seller.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .select("-password"),
      Seller.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getSeller = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id).select("-password");
    if (!seller)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};

const changeSellerStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select("-password");
    if (!seller)
      return res.status(404).json({ success: false, message: "Not found" });

    // send notification email
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: seller.email,
        subject: `Your seller account status: ${status}`,
        html: `<p>Your seller account has been <strong>${status}</strong>.</p><p>${
          notes || ""
        }</p>`,
      });
    } catch (e) {}

    res.json({ success: true, data: seller });
  } catch (err) {
    next(err);
  }
};

const deleteSeller = async (req, res, next) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller)
      return res.status(404).json({ success: false, message: "Not found" });
    seller.isActive = false;
    await seller.save();
    res.json({ success: true, message: "Seller deactivated (soft deleted)" });
  } catch (err) {
    next(err);
  }
};

// -------------------- Seller product & order dashboard helpers --------------------
/**
 * NOTE: For product/order dashboard to work correctly Product schema must include:
 *   seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" }
 */
const createProductAsSeller = async (req, res, next) => {
  try {
    const sellerId = req.seller._id;
    const payload = { ...req.body, seller: sellerId };
    const product = await Product.create(payload);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

const updateProductAsSeller = async (req, res, next) => {
  try {
    const sellerId = req.seller._id;
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (String(product.seller) !== String(sellerId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deleteProductAsSeller = async (req, res, next) => {
  try {
    const sellerId = req.seller._id;
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (String(product.seller) !== String(sellerId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};

const listSellerProducts = async (req, res, next) => {
  try {
    const sellerId = req.seller._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find({ seller: sellerId })
        .skip(Number(skip))
        .limit(Number(limit)),
      Product.countDocuments({ seller: sellerId }),
    ]);
    res.json({
      success: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};

// Seller orders: find orders that contain products of this seller
const listSellerOrders = async (req, res, next) => {
  try {
    const sellerId = mongoose.Types.ObjectId(req.seller._id);
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // pipeline: unwind items, lookup product, match product.seller, group back to orders
    const pipeline = [
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "prod",
        },
      },
      { $unwind: "$prod" },
      { $match: { "prod.seller": sellerId } },
      {
        $group: {
          _id: "$_id",
          orderId: { $first: "$_id" },
          items: { $push: "$items" },
          orderStatus: { $first: "$orderStatus" },
          paymentStatus: { $first: "$paymentStatus" },
          total: { $sum: "$items.itemTotal" },
          placedAt: { $first: "$createdAt" },
        },
      },
      { $sort: { placedAt: -1 } },
      { $skip: Number(skip) },
      { $limit: Number(limit) },
    ];

    const result = await Order.aggregate(pipeline);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Earnings summary (total sales, paid/unpaid)
const earningsSummary = async (req, res, next) => {
  try {
    const sellerId = mongoose.Types.ObjectId(req.seller._id);

    // Sum itemTotal for orders where product.seller = sellerId and paymentStatus = paid
    const pipelinePaid = [
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "prod",
        },
      },
      { $unwind: "$prod" },
      { $match: { "prod.seller": sellerId, paymentStatus: "paid" } },
      { $group: { _id: null, totalPaid: { $sum: "$items.itemTotal" } } },
    ];

    const pipelinePending = [
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "prod",
        },
      },
      { $unwind: "$prod" },
      {
        $match: {
          "prod.seller": sellerId,
          paymentStatus: { $in: ["pending", "failed"] },
        },
      },
      { $group: { _id: null, totalPending: { $sum: "$items.itemTotal" } } },
    ];

    const [paidRes, pendingRes] = await Promise.all([
      Order.aggregate(pipelinePaid),
      Order.aggregate(pipelinePending),
    ]);

    const totalPaid = (paidRes[0] && paidRes[0].totalPaid) || 0;
    const totalPending = (pendingRes[0] && pendingRes[0].totalPending) || 0;

    res.json({ success: true, data: { totalPaid, totalPending } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerSeller,
  verifySellerEmail,
  loginSeller,
  forgotPasswordStart,
  forgotPasswordVerify,
  getMe,
  updateProfile,
  changePassword,
  changeEmailStart,
  changeEmailVerify,
  uploadDocuments,
  listSellers,
  getSeller,
  changeSellerStatus,
  deleteSeller,
  createProductAsSeller,
  updateProductAsSeller,
  deleteProductAsSeller,
  listSellerProducts,
  listSellerOrders,
  earningsSummary,
};
