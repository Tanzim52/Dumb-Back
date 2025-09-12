const crypto = require("crypto");

function generateNumericOtp(length = 6) {
  const min = 10 ** (length - 1);
  return String(Math.floor(min + Math.random() * (9 * min)));
}
function hashOtp(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
function otpEmailHtml({ fullName = "", code }) {
  return `<p>Hi ${fullName || "there"},</p>
    <p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`;
}
module.exports = { generateNumericOtp, hashOtp, otpEmailHtml };
