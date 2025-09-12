const Otp = require("../models/Otp");

async function invalidatePrevious(email, purpose) {
  return Otp.updateMany(
    { email, purpose, used: false },
    { $set: { used: true } }
  );
}
async function createOtp({ email, purpose, codeHash, expiresAt, payload }) {
  return Otp.create({ email, purpose, codeHash, expiresAt, payload });
}
async function findLatestValid(email, purpose) {
  return Otp.findOne({
    email,
    purpose,
    used: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
}
async function markUsed(id) {
  return Otp.findByIdAndUpdate(id, { used: true }, { new: true });
}
async function incrementAttempts(id) {
  return Otp.findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true });
}
module.exports = {
  invalidatePrevious,
  createOtp,
  findLatestValid,
  markUsed,
  incrementAttempts,
};
