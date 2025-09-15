// src/services/couponService.js
const Coupon = require("../models/coupon");
const CouponUsage = require("../models/couponUsage");

async function validateCoupon(couponCode, cartItems, userId) {
  const coupon = await Coupon.findOne({
    code: couponCode,
    isActive: true,
    isDeleted: false,
  });
  if (!coupon) return { valid: false, reason: "INVALID_COUPON" };

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate)
    return { valid: false, reason: "NOT_STARTED" };
  if (coupon.endDate && now > coupon.endDate)
    return { valid: false, reason: "EXPIRED" };

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    return { valid: false, reason: "USAGE_LIMIT_REACHED" };

  if (userId && coupon.usagePerUser) {
    const usedByUser = await CouponUsage.countDocuments({
      couponId: coupon._id,
      userId,
    });
    if (usedByUser >= coupon.usagePerUser)
      return { valid: false, reason: "USER_LIMIT_REACHED" };
  }

  // subtotal
  const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  if (coupon.minCartValue && subtotal < coupon.minCartValue)
    return { valid: false, reason: "MIN_CART_NOT_MET" };

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = (subtotal * coupon.value) / 100;
  } else if (coupon.type === "fixed") {
    discount = coupon.value;
  } else if (coupon.type === "free_shipping") {
    discount = 0; // shipping handled separately
  } else if (coupon.type === "bogo") {
    // simplified BOGO logic
    const bogoItem = cartItems.find(
      (i) => i.productId.toString() === coupon.bogo.getProductId.toString()
    );
    if (bogoItem && bogoItem.quantity >= coupon.bogo.buyQuantity) {
      discount = (bogoItem.price || 0) * coupon.bogo.getQuantity;
    }
  }

  if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
    discount = coupon.maxDiscountAmount;
  }

  return {
    valid: true,
    discount,
    newTotal: subtotal - discount,
    coupon,
  };
}

module.exports = { validateCoupon };
