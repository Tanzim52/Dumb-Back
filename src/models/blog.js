const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    excerpt: { type: String, required: true },
    date: { type: Date, default: Date.now },
    readTime: { type: String, required: true }, // e.g. "5 min read"
    category: { type: String, required: true },
    image: { type: String, required: true }, // URL of image
    hoverText: { type: String }, // optional field for hover effects
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);
