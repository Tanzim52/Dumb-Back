// src/models/CouponUsage.js
const mongoose = require("mongoose");

const couponUsageSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },

    appliedAt: { type: Date, default: Date.now },
    amountDiscounted: { type: Number, default: 0 },

    cartSnapshot: { type: Object },
    status: {
      type: String,
      enum: ["applied", "rejected", "revoked"],
      default: "applied",
    },
    reason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("CouponUsage", couponUsageSchema);
