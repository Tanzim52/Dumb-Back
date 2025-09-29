const crypto = require("crypto");

// generate numeric OTP (n digits)
function generateNumericOtp(n = 6) {
  const min = Math.pow(10, n - 1);
  const max = Math.pow(10, n) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

// hash OTP (use constant-time hashing strategy)
function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

// html for email
function otpEmailHtml({ fullName = "", code = "" }) {
  return `
    <div>
      <p>Hi ${fullName || "Seller"},</p>
      <p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>
      <p>If you didn't request this, please ignore.</p>
      <p>Thanks — Byndio team</p>
    </div>`;
}

/* ----------------------
   Optional SMS (commented)
   To enable, install twilio and set TWILIO_SID/TWILIO_AUTH/TWILIO_FROM in .env
------------------------
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

async function sendSmsOtp(phone, message) {
  // Uncomment and configure above to use.
  return client.messages.create({ body: message, from: process.env.TWILIO_FROM, to: phone });
}
---------------------- */

module.exports = {
  generateNumericOtp,
  hashOtp,
  otpEmailHtml /*, sendSmsOtp */,
};
