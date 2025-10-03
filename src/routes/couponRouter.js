const express = require("express");
const ctrl = require("../controllers/couponController");
const { couponCreateValidation } = require("../validators/couponValidator");
const validateRequest = require("../middlewares/validateRequest");
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

// PUBLIC (USER)

router.post("/preview", ctrl.previewCoupon);
router.post("/apply", protect, ctrl.applyCoupon);

// SELLER ROUTES

router.post(
  "/seller",
  protect,
  couponCreateValidation,
  validateRequest,
  ctrl.createCoupon
);
router.get("/seller", protect, ctrl.getSellerCoupons);
router.patch("/seller/:id", protect, ctrl.updateCoupon);
router.delete("/seller/:id", protect, ctrl.deleteCoupon);

// ADMIN ROUTES

router.post(
  "/admin",
  protect,
  couponCreateValidation,
  validateRequest,
  ctrl.createCoupon
);
router.get("/admin", protect, ctrl.getCoupons);
router.patch("/admin/:id", protect, ctrl.updateCoupon);
router.delete("/admin/:id", protect, ctrl.deleteCoupon);
router.patch("/admin/toggle/:id", protect, ctrl.toggleCoupon);

// Reporting / analytics
router.get("/admin/reports", protect, ctrl.couponReports);

// EXTRA UTILITIES

// Search/filter
router.get("/search", protect, ctrl.searchCoupons);

module.exports = router;
