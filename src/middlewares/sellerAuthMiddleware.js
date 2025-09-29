const jwt = require("jsonwebtoken");
const Seller = require("../models/seller");
exports.authenticateSeller = async (req, res, next) => {
  try {
    console.log("Auth middleware running..."); // Add this for debugging

    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // Debug

    const seller = await Seller.findById(decoded.id || decoded.sellerId); // Check which field your JWT uses

    if (!seller) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - seller not found",
      });
    }

    req.user = seller; // This is what sets req.user
    console.log("req.user set to:", seller._id); // Debug

    next();
  } catch (error) {
    console.log("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};
