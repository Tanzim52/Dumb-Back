const jwt = require("jsonwebtoken");
const Seller = require("../models/seller");

/**
 * Seller authentication middleware.
 * - Expects: Authorization: Bearer <token>
 * - Token payload: { id: sellerId, role: 'seller' }
 * - Attaches req.seller if valid
 */
const sellerAuth = async (req, res, next) => {
  try {
    console.log(`Auth middleware running for route: ${req.originalUrl}`);


    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    const seller = await Seller.findById(decoded.id || decoded.sellerId);

    if (!seller) {
      return res.status(401).json({
        success: false,
        message: "Invalid token - seller not found",
      });
    }

    req.user = seller;
    console.log("req.user set to:", seller._id);

    next();
  } catch (error) {
    console.log("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

module.exports = sellerAuth;
