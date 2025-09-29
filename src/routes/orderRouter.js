const express = require("express");
const router = express.Router();
const {
  createOrderRules,
  statusUpdateRules,
  paymentUpdateRules,
} = require("../validators/orderValidator");
const validateRequest = require("../middlewares/validateRequest");
const protect = require("../middlewares/userAuthMiddleware"); // <-- destructure the middleware
const isAdmin = require("../middlewares/isAdmin");
const ctrl = require("../controllers/orderController");

// Create order (logged-in user)
router.post("/", protect, createOrderRules, validateRequest, ctrl.createOrder);

// Get logged-in user's orders
router.get("/my", protect, ctrl.getMyOrders);

// Get single order (user or admin)
router.get("/:id", protect, ctrl.getOrderById);

// Cancel (user or admin)
router.patch("/:id/cancel", protect, ctrl.cancelOrder);

// Admin: list all orders with filters
router.get("/", protect, isAdmin, ctrl.listOrders);

// Admin: update order status
router.patch(
  "/:id/status",
  protect,
  isAdmin,
  statusUpdateRules,
  validateRequest,
  ctrl.updateOrderStatus
);

// Admin: update payment status
router.patch(
  "/:id/payment",
  protect,
  isAdmin,
  paymentUpdateRules,
  validateRequest,
  ctrl.updatePaymentStatus
);

module.exports = router;
