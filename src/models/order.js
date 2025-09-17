const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true }, // snapshot
    sku: { type: String }, // snapshot
    priceAtTime: { type: Number, required: true }, // unit price
    quantity: { type: Number, required: true, min: 1 },
    itemTotal: { type: Number, required: true }, // priceAtTime * quantity
    // snapshot of seller for this item (useful for multi-seller orders)
    seller: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
      email: { type: String, trim: true, lowercase: true },
      storeId: { type: String, trim: true, lowercase: true },
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
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
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Snapshot user information to keep order records stable
    userInfo: {
      fullName: { type: String },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    items: { type: [orderItemSchema], required: true },

    shippingAddress: { type: addressSchema, required: true },

    paymentMethod: { type: String, required: true }, // e.g. 'COD', 'Card', 'PayPal'
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },

    subtotal: { type: Number, required: true }, // sum of item totals
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }, // subtotal + shipping - discount

    placedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },

    meta: {
      notes: { type: String },
      coupon: { type: String },
    },
  },
  { timestamps: true }
);

orderSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
orderSchema.set("toJSON", { virtuals: true });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
module.exports = Order;
