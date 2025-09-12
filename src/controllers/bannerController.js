const Banner = require("../models/banner");

// Create
const createBanner = async (req, res) => {
  try {
    const banner = new Banner(req.body);
    const newBanner = await banner.save();
    res.status(201).json({ success: true, data: newBanner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all (only active banners, sorted by priority)
const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({
      $or: [
        { isActive: true },
        { startDate: { $lte: new Date() }, endDate: { $gte: new Date() } },
      ],
    }).sort({ priority: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single
const getBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    res.status(200).json({ success: true, message: "Banner deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBanner,
  getBanners,
  getBanner,
  updateBanner,
  deleteBanner,
};
