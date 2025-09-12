const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String },
    phone: { type: String },
    street: { type: String },
    apartment: { type: String },
    area: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String },
    addressType: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    userName: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    profilePicture: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  phone: {
      type: String,
      unique: true,
      sparse: true, 
      validate: {
        validator: function (v) {
          if (!this.isGoogleUser && !v) {
            return false;
          }
          return true;
        },
        message: "Phone number is required for normal signup",
      },
    },
    dob: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    addresses: { type: [addressSchema], default: [] },
    password: {
    type: String,
    required: function () {
    return !this.isGoogleUser;
      },
    },
    isGoogleUser: { type: Boolean, default: false },
    userType: { type: String, enum: ["user", "admin"], default: "user" },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Virtual clean id
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
userSchema.set("toJSON", { virtuals: true });

// ✅ Auto-generate userName from email
userSchema.pre("save", async function (next) {
  if (!this.userName && this.email) {
    let baseName = this.email.split("@")[0].toLowerCase();
    this.userName = baseName;

    // Ensure uniqueness
    let counter = 1;
    while (await mongoose.models.User.findOne({ userName: this.userName })) {
      this.userName = `${baseName}${counter}`;
      counter++;
    }
  }
  next();
});

// ✅ Prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;
