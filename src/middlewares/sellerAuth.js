const jwt = require("jsonwebtoken");
const Seller = require("../models/seller");

/**
 * Seller authentication middleware.
 * Expects Authorization: Bearer <token>
 * Token payload: { id: sellerId, role: 'seller' } (we sign like that in login)
 * Attaches req.seller
 */
const sellerAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id)
      return res.status(401).json({ success: false, message: "Invalid token" });

    const seller = await Seller.findById(decoded.id).select("-password");
    if (!seller)
      return res
        .status(401)
        .json({ success: false, message: "Seller not found" });
    if (!seller.isActive)
      return res
        .status(403)
        .json({ success: false, message: "Seller deactivated" });
    req.seller = seller;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};

module.exports = sellerAuth;
