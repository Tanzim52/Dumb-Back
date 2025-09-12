const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Otp = require("../models/Otp");
const transporter = require("../config/mailer");
const {
  generateNumericOtp,
  otpEmailHtml,
  hashOtp,
} = require("../utils/generateOtp");
const authService = require("../services/authService");

// Utility: create unique userName from email
async function uniqueUserNameFromEmail(email) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
  let candidate = base;
  let suffix = 0;
  while (true) {
    const exists = await User.findOne({ userName: candidate });
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
}

// @route POST /api/auth/register/start
// @desc  Accept partial profile, create pending OTP record (do NOT create User), send OTP to email
// @access Public
const registerStart = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      profilePicture,
      dob,
      gender,
      addresses,
    } = req.body;

    // If a fully verified user already exists, block registration
    const existingVerified = await User.findOne({ email, emailVerified: true });
    if (existingVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already registered and verified",
      });
    }

    // Hash password now (we store hashed password in OTP payload)
    const hashed = await bcrypt.hash(password, 10);

    // Prepare payload to create user at verification time
    const userName = await uniqueUserNameFromEmail(email);
    const payload = {
      fullName,
      userName,
      phone,
      profilePicture,
      email,
      dob,
      gender,
      addresses: Array.isArray(addresses) ? addresses : [],
      password: hashed,
      userType: "user",
      emailVerified: true,
      isGoogleUser: false,
    };

    // Generate & store OTP (10 min)
    const code = generateNumericOtp(6);
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate previous OTPs for this purpose
    await Otp.updateMany(
      { email, purpose: "register_email", used: false },
      { $set: { used: true } }
    );

    // Create new OTP record with payload
    await Otp.create({
      email,
      purpose: "register_email",
      codeHash,
      expiresAt,
      payload,
    });

    // Send email
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Your Byndio verification code",
      html: otpEmailHtml({ fullName, code }),
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to email. Expires in 10 minutes.",
    });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/auth/register/verify
// @desc  Verify email OTP; create user from payload and return JWT
// @access Public
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({
      email,
      purpose: "register_email",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not found" });
    }

    // Check attempts
    if (record.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Request a new OTP.",
      });
    }

    // Compare hashed OTP
    const providedHash = hashOtp(otp);
    if (providedHash !== record.codeHash) {
      // increment attempts
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Mark OTP used
    record.used = true;
    await record.save();

    // Build user data from payload
    const payload = record.payload;
    if (!payload || !payload.email) {
      return res
        .status(400)
        .json({ success: false, message: "Registration payload missing" });
    }

    // If a verified user appeared meanwhile, block
    const already = await User.findOne({
      email: payload.email,
      emailVerified: true,
    });
    if (already) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    // Try to create user; handle possible username collision at create time
    let createdUser;
    try {
      createdUser = await User.create(payload);
    } catch (err) {
      // If duplicate key on userName, try to generate a new username and retry once
      if (
        err.code === 11000 &&
        err.message &&
        err.message.includes("userName")
      ) {
        const newUserName = await uniqueUserNameFromEmail(payload.email);
        payload.userName = newUserName;
        createdUser = await User.create(payload);
      } else {
        throw err;
      }
    }

    // Return user (without password) and token
    const token = jwt.sign({ id: createdUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    const { password: _, ...userSafe } = createdUser.toObject();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: { user: userSafe, token },
    });
  } catch (err) {
    next(err);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const { email, fullName, profilePicture } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // If not exists → create user
      let payload = {
        email,
        fullName,
        profilePicture,
        userType: "user",
        isGoogleUser: true,
      };

      try {
        user = await User.create(payload);
      } catch (err) {
        // Handle duplicate username issue
        if (err.code === 11000 && err.message.includes("userName")) {
          const newUserName = await uniqueUserNameFromEmail(email);
          payload.userName = newUserName;
          user = await User.create(payload);
        } else {
          throw err;
        }
      }
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const { password: _, ...userSafe } = user.toObject();

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      data: { user: userSafe, token },
    });
  } catch (err) {
    next(err);
  }
};

// (Optional hardening) modify login to require verified email
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email });
    if (!u)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const ok = await require("bcryptjs").compare(password, u.password);
    if (!ok)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    if (!u.emailVerified) {
      return res
        .status(403)
        .json({ success: false, message: "Please verify your email first" });
    }

    const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    const { password: _, ...userSafe } = u.toObject();
    res.json({
      success: true,
      message: "Login successful",
      data: { user: userSafe, token },
    });
  } catch (e) {
    next(e);
  }
};

//  get user my email -------------------------------------
const getUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Exclude password from response
    const { password, ...userSafe } = user.toObject();

    res.json({
      success: true,
      message: "User retrieved successfully",
      data: userSafe,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------- FORGOT PASSWORD FLOW ----------------------
// Step 1: start forgot password -> send OTP to user's verified email
const forgotPasswordStart = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPasswordStart(email);
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    // map known service errors to safe responses
    if (err.code === "NO_USER" || err.code === "OTP_MISSING") {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.code === "TOO_MANY") {
      return res.status(429).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// Step 2: verify OTP + provide new password -> update user's password
const forgotPasswordVerify = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await authService.forgotPasswordVerify(
      email,
      otp,
      newPassword
    );
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    if (err.code === "INVALID_OTP") {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.code === "NO_USER") {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

//user update

const updateProfile = async (req, res, next) => {
  try {
    const updates = (({
      fullName,
      profilePicture,
      dob,
      gender,
      addresses,
    }) => ({
      fullName,
      profilePicture,
      dob,
      gender,
      addresses,
    }))(req.body);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok)
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

// ---------------- EMAIL CHANGE FLOW ----------------

// Step 1: send OTP to new email
const changeEmailStart = async (req, res, next) => {
  console.log(req.body)
  try {
    const { newEmail } = req.body;

    if (!newEmail)
      return res
        .status(400)
        .json({ success: false, message: "New email required" });

    const existing = await User.findOne({ email: newEmail });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });

    const code = generateNumericOtp(6);
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.updateMany(
      { email: newEmail, purpose: "change_email", used: false },
      { $set: { used: true } }
    );

    await Otp.create({
      email: newEmail,
      purpose: "change_email",
      codeHash,
      expiresAt,
      payload: { userId: req.user._id },
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: newEmail,
      subject: "Confirm your new email",
      html: otpEmailHtml({ fullName: req.user.fullName, code }),
    });

    res.json({
      success: true,
      message: "OTP sent to new email. Expires in 10 minutes.",
    });
  } catch (err) {
    next(err);
  }
};

// Step 2: verify OTP & update email
const changeEmailVerify = async (req, res, next) => {
  try {
    const { newEmail, otp } = req.body;
    const record = await Otp.findOne({
      email: newEmail,
      purpose: "change_email",
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

    const { userId } = record.payload;
    const user = await User.findByIdAndUpdate(
      userId,
      { email: newEmail },
      { new: true }
    ).select("-password");

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      success: true,
      message: "Email updated successfully",
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerStart,
  verifyEmail,
  login,
  getUserByEmail,
  forgotPasswordStart,
  forgotPasswordVerify,
  googleAuth,

  updateProfile,
  changePassword,
  changeEmailStart,
  changeEmailVerify,
};
