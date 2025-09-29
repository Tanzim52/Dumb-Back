// src/controllers/sellerController.js
const Seller = require("../models/seller");
const Otp = require("../models/Otp");
const jwt = require("jsonwebtoken");
const transporter = require("../config/mailer");
const { generateNumericOtp, hashOtp, otpEmailHtml } = require("../utils/otp");

// Utils
const signSellerToken = (seller) =>
  jwt.sign({ id: seller._id, role: "seller" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

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
    console.log("req.user:", req.user); // Add this first
    console.log("req.user._id:", req.user?._id);
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
    console.log("req.user:", req.user);
    console.log("req.user._id:", req.user?._id);

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
    console.log("req.user:", req.user);
    console.log("req.user._id:", req.user?._id);

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
    console.log(returnPolicy);

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





// Step 6: Plan
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

// Step 7: Final submit
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

module.exports = {
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
};
