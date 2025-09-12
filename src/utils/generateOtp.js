const crypto = require("crypto");

function generateNumericOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function otpEmailHtml({ fullName, code }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Email Verification</h2>
      <p>Hi ${fullName || "there"},</p>
      <p>Your verification code is:</p>
      <div style="font-size:24px;font-weight:700;letter-spacing:3px">${code}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

module.exports = { generateNumericOtp, otpEmailHtml, hashOtp };
