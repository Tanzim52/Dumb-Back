const mongoose = require("mongoose");

// Child Category Schema
const childCategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

// Subcategory Schema
const subCategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    childCategories: { type: [childCategorySchema], default: [] },
  },
  { _id: false }
);

// Main Category Schema
const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    subCategories: { type: [subCategorySchema], default: [] },
  },
  { timestamps: true }
);

// Virtual clean id
categorySchema.virtual("categoryId").get(function () {
  return this._id.toHexString();
});
categorySchema.set("toJSON", { virtuals: true });

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

module.exports = Category;
