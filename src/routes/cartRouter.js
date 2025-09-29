const express = require("express");
const router = express.Router();

const {
  createCart,
  getCart,
  updateCartItem,
  deleteCartItem,
  emptyCart,
  mergeGuestCart,
} = require("../controllers/cartController");

const { cartValidation } = require("../validators/cartValidator");
const validateRequest = require("../middlewares/validateRequest");
const protect = require("../middlewares/userAuthMiddleware");

// Protect all routes
router.use(protect);

// Add product to cart
router.post("/", cartValidation, validateRequest, createCart);

// Get user’s cart (?userId=...)
router.get("/", getCart);

// Update cart item quantity
router.put("/:id", updateCartItem);

// Delete single cart item
router.delete("/:id", deleteCartItem);

// Empty cart (clear all items for a user)
router.delete("/", emptyCart);

// Merge guest cart into logged-in user cart
router.post("/merge", mergeGuestCart);

module.exports = router;
