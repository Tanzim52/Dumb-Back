const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
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
const Order = require("../models/Order"); // used for seller earnings/orders

// Helper: sign seller token (role included)
function signSellerToken(seller) {
  return jwt.sign({ id: seller._id, role: "seller" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// ---------------------- REGISTER FLOW ----------------------

// Step 1: Start registration (Send OTP only)
const registerStart = async (req, res, next) => {
  try {
    const { type, plan, sellerInfo } = req.body;

    // If a verified seller already exists, block
    const existingVerified = await Seller.findOne({
      "sellerInfo.email": sellerInfo.email,
      emailVerified: true,
    });
    if (existingVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already registered and verified",
      });
    }

    // Invalidate old OTPs for same email
    await Otp.updateMany(
      { email: sellerInfo.email, purpose: "seller_register_email", used: false },
      { $set: { used: true } }
    );

    // Generate OTP
    const code = generateNumericOtp(6);
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store payload in OTP (not in Seller DB yet)
    await Otp.create({
      email: sellerInfo.email,
      purpose: "seller_register_email",
      codeHash,
      expiresAt,
      payload: { type, plan, sellerInfo },
    });

    // Send OTP to email
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: sellerInfo.email,
      subject: "Verify your Byndio Seller Account",
      html: otpEmailHtml({ code }),
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to email. Expires in 10 minutes.",
    });
  } catch (err) {
    next(err);
  }
};


// Step 2: Verify OTP and save seller
const verifySellerEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({
      email,
      purpose: "seller_register_email",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ success: false, message: "OTP expired or not found" });
    }

    // Check OTP
    if (hashOtp(otp) !== record.codeHash) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Mark OTP used
    record.used = true;
    await record.save();

    const payload = record.payload;
    if (!payload || !payload.sellerInfo?.email) {
      return res.status(400).json({ success: false, message: "Registration payload missing" });
    }

    // Double-check seller not created meanwhile
    const already = await Seller.findOne({
      "sellerInfo.email": payload.sellerInfo.email,
      emailVerified: true,
    });
    if (already) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Create seller in DB
    const seller = await Seller.create({
      type: payload.type || "individual",
      plan: payload.plan || null,
      sellerInfo: payload.sellerInfo,
      onboardingStep: "email_verified",
      emailVerified: true,
      status: "pending",
    });

    // Remove sensitive fields
    seller.sellerInfo.password = undefined;

    const token = signSellerToken(seller);

    return res.status(200).json({
      success: true,
      message: "Email verified & seller registered",
      data: { seller, token },
    });
  } catch (err) {
    next(err);
  }
};

// Step 3 (Alternative): Save Additional Info
const registerAdditionalInfo = async (req, res, next) => {
  try {
    // console.log("req.user:", req.user); // Add this first
    // console.log("req.user._id:", req.user?._id);
    const { additionalInfo } = req.body;
  
    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      {
        "additionalInfo.fullName": additionalInfo.fullName,
        "additionalInfo.businessName": additionalInfo.businessName,
        "additionalInfo.businessType": additionalInfo.businessType,
        "additionalInfo.storeName": additionalInfo.storeName,
        "additionalInfo.country": additionalInfo.country,
        "additionalInfo.currency": additionalInfo.currency,
        "additionalInfo.pickupStreet": additionalInfo.pickupStreet,
        "additionalInfo.pickupArea": additionalInfo.pickupArea,
        "additionalInfo.pickupCity": additionalInfo.pickupCity,
        "additionalInfo.pickupState": additionalInfo.pickupState,
        "additionalInfo.pinCode": additionalInfo.pinCode,
        onboardingStep: "additional_info_added",
      },
      { new: true }
    );

    if (!seller) {
      return res
        .status(404)
        .json({ success: false, message: "Seller not found" });
    }

    res.json({
      success: true,
      message: "Additional info saved",
      data: seller,
    });
  } catch (err) {
    next(err);
  }
};

// Step 4: Business details
const registerBusiness = async (req, res, next) => {
  try {
    // console.log("req.user:", req.user);
    // console.log("req.user._id:", req.user?._id);

    const { businessInfo } = req.body;

    // Update seller with only businessInfo
    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      {
        businessInfo: {
          businessType: businessInfo.businessType,
          businessWebsite: businessInfo.businessWebsite,
          primaryCategory: businessInfo.primaryCategory,
          registrationNumber: businessInfo.registrationNumber,
          taxId: businessInfo.taxId,
          businessDescription: businessInfo.businessDescription,
        },
        onboardingStep: "business_added",
      },
      { new: true }
    );

    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    res.json({ success: true, message: "Business info saved", data: seller });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Step 5: Documents (KYC)
const registerDocuments = async (req, res, next) => {
  try {
    const { identityInfo} = req.body;
    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      {
        identityInfo: {
          idType: identityInfo.idType,
          governmentIdUrl: identityInfo.governmentIdUrl,
          selfieUrl: identityInfo.selfieUrl,
        },
        onboardingStep: "identityInfo_uploaded",
      },
      { new: true }
    );
    res.json({ success: true, message: "Documents uploaded", data: seller });
  } catch (err) {
    next(err);
  }
};

// Step 6: Payout
const registerPayout = async (req, res, next) => {
    // console.log("req.user:", req.user);
    // console.log("req.user._id:", req.user?._id);

  try {
    const { payoutInfo} = req.body;
    // Update only the payout section of the seller
    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      {
        payoutInfo: {
          payoutMethod: payoutInfo.payoutMethod,
          accountHolderName: payoutInfo.accountHolderName,
          accountNumber: payoutInfo.accountNumber,
          bankName: payoutInfo.bankName,
          routingNumber: payoutInfo.routingNumber || "",
        },
        onboardingStep: "payout_added",
      },
      { new: true }
    );

    res.json({ success: true, message: "Payout info saved", data: seller});
  } catch (err) {
    next(err);
  }
};

// Step 7: Tax Info
const registerTaxInfo = async (req, res, next) => {
  try {
    const { taxInfo } = req.body;
  console.log(taxInfo)
    // Update only the tax section of the seller
    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      {
        taxInfo: {
          taxFormType: taxInfo.taxFormType,
          taxDocumentUrl: taxInfo.taxDocumentUrl,
        },
        onboardingStep: "tax_info_added",
      },
      { new: true }
    );

    res.json({ success: true, message: "Tax info saved", data: seller });
  } catch (err) {
    next(err);
  }
};


// Step 8: Return Policy
const registerReturnPolicy = async (req, res, next) => {
  try {
    const { returnPolicy } = req.body;

    // Update only the return policy section of the seller
    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      {
        returnPolicy: {
          returnPolicy: returnPolicy.returnPolicy,
          handlingTime: returnPolicy.handlingTime,
          logisticsMethod: returnPolicy.logisticsMethod,
          shippingRegions: returnPolicy.shippingRegions,
        },
        onboardingStep: "return_policy_added",
      },
      { new: true }
    );

    res.json({ success: true, message: "Return policy saved", data: seller });
  } catch (err) {
    next(err);
  }
};


// Step 9: Plan
const registerPlan = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const start = new Date();
    let end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      {
        subscriptionPlan: plan.id,
        subscriptionStart: start,
        subscriptionEnd: end,
        onboardingStep: "plan_chosen",
      },
      { new: true }
    );
    res.json({ success: true, message: "Plan chosen", data: seller });
  } catch (err) {
    next(err);
  }
};

// Step 10: Final submit
const registerSubmit = async (req, res, next) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.user._id,
      { onboardingStep: "completed", status: "pending" },
      { new: true }
    );
    res.json({
      success: true,
      message: "Registration completed, waiting for admin approval",
      data: seller,
    });
  } catch (err) {
    next(err);
  }
};

// seller get
const getSellerById = async (req, res, next) => {

  try {
    // req.user is populated by authenticateSeller middleware
    const seller = await Seller.findById(req.user._id);
    console.log(seller)
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }
    res.json({ success: true, message: "Seller fetched successfully", data: seller });
  } catch (err) {
    next(err);
  }
};


const login = async (req, res, next) => {
  console.log(req.body); 
  try {
    const { email, password } = req.body;
    // Find seller by nested email
    const u = await Seller.findOne({ "sellerInfo.email": email });
    if (!u)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    // Compare password (stored in sellerInfo.password)
    const ok = await bcrypt.compare(password, u.sellerInfo.password);
    if (!ok)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    // Check if email verified
    if (!u.emailVerified) {
      return res
        .status(403)
        .json({ success: false, message: "Please verify your email first" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Return seller data excluding password
    const sellerSafe = u.toObject();
    delete sellerSafe.sellerInfo.password;

    res.json({
      success: true,
      message: "Login successful",
      data: { seller: sellerSafe, token },
    });
  } catch (e) {
    next(e);
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
  verifySellerEmail,
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
  registerStart,
  verifySellerEmail,
  registerAdditionalInfo,
  registerBusiness,
  registerDocuments,
  registerPayout,
  registerTaxInfo,
  registerReturnPolicy,
  registerPlan,
  registerSubmit,
  getSellerById,
  login,
};
