const bcrypt = require("bcryptjs");
const transporter = require("../config/mailer"); // keep existing transporter
const userRepo = require("../repositories/userRepository");
const otpRepo = require("../repositories/otpRepository");
const { generateNumericOtp, hashOtp, otpEmailHtml } = require("../utils/otp");

async function forgotPasswordStart(email) {
  const user = await userRepo.findByEmail(email);
  if (!user || !user.emailVerified) {
    // avoid leaking existence; return same shape so controller can map to 200/400 as desired
    const err = new Error("No verified account found for email");
    err.code = "NO_USER";
    throw err;
  }

  await otpRepo.invalidatePrevious(email, "forgot_password");

  const code = generateNumericOtp(6);
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await otpRepo.createOtp({
    email,
    purpose: "forgot_password",
    codeHash,
    expiresAt,
    payload: { userId: user._id },
  });

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: "Byndio password reset code",
    html: otpEmailHtml({ fullName: user.fullName || user.fullName, code }),
  });

  return {
    message: "Password reset OTP sent to email. Expires in 10 minutes.",
  };
}

async function forgotPasswordVerify(email, otp, newPassword) {
  const record = await otpRepo.findLatestValid(email, "forgot_password");
  if (!record) {
    const err = new Error("OTP expired or not found");
    err.code = "OTP_MISSING";
    throw err;
  }
  if (record.attempts >= 5) {
    const err = new Error("Too many attempts. Request a new OTP.");
    err.code = "TOO_MANY";
    throw err;
  }

  const providedHash = hashOtp(otp);
  if (providedHash !== record.codeHash) {
    await otpRepo.incrementAttempts(record._id);
    const err = new Error("Invalid OTP");
    err.code = "INVALID_OTP";
    throw err;
  }

  await otpRepo.markUsed(record._id);

  const userId = record.payload && record.payload.userId;
  const user = userId
    ? await userRepo.findById(userId)
    : await userRepo.findByEmail(email);
  if (!user) {
    const err = new Error("User not found");
    err.code = "NO_USER";
    throw err;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await userRepo.updatePassword(user._id, hashed);

  return { message: "Password has been reset successfully." };
}

module.exports = { forgotPasswordStart, forgotPasswordVerify };
