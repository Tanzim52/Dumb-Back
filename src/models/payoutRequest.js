// src/models/PayoutRequest.js
const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ["bank","upi","paypal","other"], required: true },
  accountDetails: { type: Object, default: {} },
  status: { type: String, enum: ["requested","processing","paid","rejected"], default: "requested" },
  adminNote: String,
  processedAt: Date
}, { timestamps: true });

module.exports = mongoose.models.PayoutRequest || mongoose.model("PayoutRequest", payoutSchema);
