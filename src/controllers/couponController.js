// src/controllers/couponController.js
const Coupon = require("../models/coupon");
const CouponUsage = require("../models/couponUsage");
const { validateCoupon } = require("../services/couponService");

exports.previewCoupon = async (req, res, next) => {
  try {
    const { couponCode, cartItems, userId } = req.body;
    const result = await validateCoupon(couponCode, cartItems, userId);
    return res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};

exports.applyCoupon = async (req, res, next) => {
  try {
    const { couponCode, cartItems } = req.body;
    const userId = req.user._id;

    const result = await validateCoupon(couponCode, cartItems, userId);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    // Increment usage
    await Coupon.findByIdAndUpdate(result.coupon._id, {
      $inc: { usedCount: 1 },
    });

    await CouponUsage.create({
      couponId: result.coupon._id,
      userId,
      cartSnapshot: cartItems,
      amountDiscounted: result.discount,
    });

    return res.json({
      success: true,
      message: "Coupon applied successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// Admin/Seller management
exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
};

exports.getCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ isDeleted: false });
    res.json({ success: true, data: coupons });
  } catch (err) {
    next(err);
  }
};

//  Seller: only own coupons
exports.getSellerCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({
      createdBy: req.user._id,
      isActive: true,
     
    });
    res.json({ success: true, data: coupons });
  } catch (err) {
    next(err);
  }
};

//  Update coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
};

//  Soft delete coupon
exports.deleteCoupon = async (req, res, next) => {
  try {
    await Coupon.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    next(err);
  }
};

//  Toggle active/inactive
exports.toggleCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
};

//  Search coupons
exports.searchCoupons = async (req, res, next) => {
  try {
    const { code, status } = req.query;
    const query = {};
    if (code) query.code = new RegExp(code, "i");
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const coupons = await Coupon.find(query);
    res.json({ success: true, data: coupons });
  } catch (err) {
    next(err);
  }
};

//  Reports / Analytics
exports.couponReports = async (req, res, next) => {
  try {
    const stats = await CouponUsage.aggregate([
      {
        $group: {
          _id: "$couponId",
          totalUsed: { $sum: 1 },
          totalDiscount: { $sum: "$amountDiscounted" },
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "_id",
          foreignField: "_id",
          as: "coupon",
        },
      },
      { $unwind: "$coupon" },
    ]);

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};
