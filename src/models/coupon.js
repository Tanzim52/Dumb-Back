const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: { type: String, required: true },
    description: { type: String },

    type: {
      type: String,
      enum: ["percentage", "fixed", "free_shipping", "bogo"],
      required: true,
    },
    value: { type: Number, required: true },
    maxDiscountAmount: Number,
    minCartValue: Number,

    scope: {
      global: { type: Boolean, default: true },
      sellers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Seller" }],
      categories: [{ type: String }],
      productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    },

    usageLimit: Number,
    usagePerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },

    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },

    combinable: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },

    bogo: {
      buyQuantity: Number,
      getQuantity: Number,
      getProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags: [String],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
