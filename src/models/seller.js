// src/models/Seller.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const planSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: String,
  features: [String],
}, { _id: false });

const sellerInfoSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  acceptTerms: { type: Boolean, default: false },
}, { _id: false });

const additionalInfoSchema = new mongoose.Schema({
  fullName: String,
  businessName: String,
  businessType: String,
  storeName: String,
  country: String,
  currency: String,
  pickupStreet: String,
  pickupArea: String,
  pickupCity: String,
  pickupState: String,
  pinCode: String,
}, { _id: false });

const businessInfoSchema = new mongoose.Schema({
  businessType: String,
  businessWebsite: String,
  primaryCategory: String,
  registrationNumber: String,
  taxId: String,
  businessDescription: String,
}, { _id: false });

const identityInfoSchema = new mongoose.Schema({
  idType: String,
  governmentIdUrl: String,
  selfieUrl: String,
}, { _id: false });

const payoutInfoSchema = new mongoose.Schema({
  payoutMethod: { type: String, default: "bank" },
  accountHolderName: String,
  accountNumber: String,
  bankName: String,
  routingNumber: String,
}, { _id: false });

const taxInfoSchema = new mongoose.Schema({
  taxFormType: String,
  taxDocumentUrl: String,
}, { _id: false });

const returnPolicySchema = new mongoose.Schema({
  returnPolicy: String,
  handlingTime: String,
  logisticsMethod: String,
  shippingRegions: [String],
}, { _id: false });

// Main Seller schema
const sellerSchema = new mongoose.Schema({
  // unique store identifier
  storeId: {type: String, unique: true, required: true, index: true,
    },
  type: { type: String, default: "individual" },
  plan: planSchema,
  sellerInfo: sellerInfoSchema,
  additionalInfo: additionalInfoSchema,
  businessInfo: businessInfoSchema,
  identityInfo: identityInfoSchema,
  payoutInfo: payoutInfoSchema,
  taxInfo: taxInfoSchema,
  returnPolicy: returnPolicySchema,

  // Onboarding & system fields
  onboardingStep: {
    type: String,
    enum: [
      "started",
      "email_verified",
      "business_added",
      "documents_uploaded",
      "payout_added",
      "plan_chosen",
      "completed",
    ],
    default: "started",
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending",
  },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  isStoreLive: { type: Boolean, default: false },
}, { timestamps: true });




sellerSchema.pre("save", async function (next) {
  if (!this.isModified("sellerInfo.password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.sellerInfo.password = await bcrypt.hash(this.sellerInfo.password, salt);
  return next();
});

sellerSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.sellerInfo.password);
};

sellerSchema.set("toJSON", { virtuals: true });
sellerSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Auto-generate unique storeId
sellerSchema.pre("validate", async function (next) {
  if (!this.storeId) {
    this.storeId = `BYN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

module.exports =
  mongoose.models.Seller || mongoose.model("Seller", sellerSchema);
