const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    priceAtAdd: {
      // store product price at add-to-wishlist time (optional)
      type: Number,
    },
    isActive: {
      // allow soft-remove or toggle behaviour
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate wishlist entries per user+product
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

wishlistSchema.set("toJSON", { virtuals: true, versionKey: false });

module.exports = mongoose.model("Wishlist", wishlistSchema);
