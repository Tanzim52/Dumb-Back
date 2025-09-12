const User = require("../models/user");

async function findByEmail(email) {
  return User.findOne({ email });
}
async function findById(id) {
  return User.findById(id);
}
async function updatePassword(userId, hashedPassword) {
  return User.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true }
  );
}
module.exports = { findByEmail, findById, updatePassword };
