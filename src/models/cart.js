const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
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
    // allow storing selected options like size and color
    size: {
      type: String,
      trim: true,
      default: null,
    },
    color: {
      type: String,
      trim: true,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    priceAtTime: {
      // store product price at add-to-cart time (for stability)
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Virtual total for each item
cartSchema.virtual("itemTotal").get(function () {
  return this.quantity * this.priceAtTime;
});

cartSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Cart", cartSchema);
