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
    // Unique public store identifier (generated)
    storeId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

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

// Generate a unique storeId if not provided
const crypto = require("crypto");
function slugify(input) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

sellerSchema.pre("save", async function (next) {
  if (!this.storeId) {
    const base = slugify(this.businessName || this.ownerName || "store");
    let candidate;
    let tries = 0;
    do {
      const rand = crypto.randomBytes(3).toString("hex");
      candidate = `${base}-${rand}`.replace(/(^-|-$)+/g, "");
      tries += 1;
      // safety: break after a few attempts
      if (tries > 10) break;
    } while (await mongoose.models.Seller.findOne({ storeId: candidate }));
    this.storeId = candidate;
  }
  next();
});

const Seller = mongoose.models.Seller || mongoose.model("Seller", sellerSchema);
module.exports = Seller;
