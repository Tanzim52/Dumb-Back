const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema(
  {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  { _id: false }
);

const bankSchema = new mongoose.Schema(
  {
    accountHolder: String,
    accountNumber: String,
    bankName: String,
    branchInfo: String,
    ifsc: String,
  },
  { _id: false }
);

const documentsSchema = new mongoose.Schema(
  {
    idNumber: String,
    taxNumber: String,
    businessLicenseUrl: String,
    idCardUrl: String,
  },
  { _id: false }
);

const sellerSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true, index: true },
    ownerName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, unique: true, trim: true },

    password: { type: String, required: true },

    businessType: {
      type: String,
      enum: ["individual", "company"],
      default: "individual",
    },

    address: { type: addressSchema, default: {} },

    documents: { type: documentsSchema, default: {} },

    bankDetails: { type: bankSchema, default: {} },

    logoUrl: { type: String },

    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "paypal", "stripe", "other"],
      default: "bank_transfer",
    },

    // Approval & activation
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    isActive: { type: Boolean, default: true },

    // Email verification (OTP)
    emailVerified: { type: Boolean, default: false },

    meta: {
      notes: String,
    },
  },
  { timestamps: true }
);

/** Hash password on save if changed */
sellerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

/** Instance method to compare password */
sellerSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

sellerSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
sellerSchema.set("toJSON", { virtuals: true });

const Seller = mongoose.models.Seller || mongoose.model("Seller", sellerSchema);
module.exports = Seller;
