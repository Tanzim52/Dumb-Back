const mongoose = require("mongoose");

const urlRegex = /^(https?:\/\/)[^\s]+$/i;

const productSchema = new mongoose.Schema(
  {
    // Optional external mapping from feed
    externalId: { type: Number, index: true },

    name: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },

    // Category code like "cat5_1_1_1"
    category: { type: String, required: true, index: true, trim: true },
    subcategory: { type: String, trim: true, index: true },

    brand: { type: String, trim: true, index: true },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    price: { type: Number, required: true, min: 0 },
    discount_price: { type: Number, min: 0 },

    stock_quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "pcs", trim: true },

    availability_status: {
      type: String,
      enum: ["In Stock", "Out of Stock", "Preorder", "Discontinued"],
      default: "In Stock",
    },

    images: [
      {
        type: String,
        validate: {
          validator: (v) => urlRegex.test(v),
          message: "Invalid image URL",
        },
      },
    ],
    video: {
      type: String,
      validate: {
        validator: (v) => !v || urlRegex.test(v),
        message: "Invalid video URL",
      },
    },

    attributes: {
      size: [{ type: String, trim: true }],
      color: [{ type: String, trim: true }],
      weight: { type: String, trim: true },
      dimensions: { type: String, trim: true },
      material: { type: String, trim: true },
      // allow extra attributes without schema errors
    },

    shipping: {
      shipping_weight: { type: String, trim: true },
      package_dimensions: { type: String, trim: true },
      delivery_options: [{ type: String, trim: true }],
      shipping_cost: { type: Number, min: 0 },
    },

    metadata: {
      tags: [{ type: String, trim: true, index: true }],
      rating: { type: Number, min: 0, max: 5, default: 0 },
      reviews_count: { type: Number, min: 0, default: 0 },
      warranty: { type: String, trim: true },
      return_policy: { type: String, trim: true },
    },

    is_new_arrival: { type: Boolean, default: false, index: true },
    is_best_seller: { type: Boolean, default: false, index: true },
    is_deal: { type: Boolean, default: false, index: true },
    added_date: { type: Date, index: true },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      index: true,
    },
    // Snapshot fields for seller contact and store id to avoid extra joins later
    sellerEmail: { type: String, trim: true, lowercase: true, index: true },
    sellerStoreId: { type: String, trim: true, lowercase: true, index: true },
  },
  { timestamps: true, strict: "throw" }
);

// Text search
productSchema.index(
  { name: "text", description: "text", brand: "text", "metadata.tags": "text" },
  { weights: { name: 5, brand: 3, description: 2, "metadata.tags": 2 } }
);

// Helpers
function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Pre-validate rules
productSchema.pre("validate", function (next) {
  if (
    this.discount_price != null &&
    this.price != null &&
    this.discount_price > this.price
  ) {
    return next(new Error("discount_price cannot be greater than price"));
  }
  // Dedupe images
  if (Array.isArray(this.images)) {
    const seen = new Set();
    this.images = this.images.filter((u) => {
      const key = (u || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (!this.added_date) this.added_date = new Date();
  next();
});

// Slug generation
productSchema.pre("save", async function (next) {
  if (!this.slug && this.name) {
    let base = slugify(this.name);
    // make it stable with sku tail if available
    if (this.sku) base = `${base}-${this.sku.toLowerCase()}`;
    let candidate = base;
    let i = 0;
    while (await mongoose.models.Product.findOne({ slug: candidate })) {
      i += 1;
      candidate = `${base}-${i}`;
    }
    this.slug = candidate;
  }
  next();
});

// Populate seller snapshot (email and storeId) before saving
productSchema.pre("save", async function (next) {
  try {
    if (this.seller) {
      const Seller = mongoose.models.Seller || require("./seller");
      const s = await Seller.findById(this.seller).select("email storeId");
      if (s) {
        this.sellerEmail = s.email;
        this.sellerStoreId = s.storeId || null;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

productSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
productSchema.set("toJSON", { virtuals: true });

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
module.exports = Product;
