const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, required: true }, // store URL or path
    link: { type: String }, // optional redirect link
    isActive: { type: Boolean, default: true }, // show/hide on homepage
    priority: { type: Number, default: 0 }, // order banners
    startDate: { type: Date }, // optional scheduling
    endDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
