const { body, param, query } = require("express-validator");

const orderItemRules = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("items must be a non-empty array"),
  body("items.*.product")
    .notEmpty()
    .withMessage("product id is required")
    .isMongoId()
    .withMessage("product must be a valid MongoDB id"),
  body("items.*.quantity")
    .notEmpty()
    .withMessage("quantity is required")
    .isInt({ gt: 0 })
    .withMessage("quantity must be > 0"),
];

const addressRules = [
  body("shippingAddress.fullName")
    .notEmpty()
    .withMessage("Receiver name required"),

  body("shippingAddress.phone")
    .notEmpty()
    .withMessage("Phone is required"),

  body("shippingAddress.street")
    .notEmpty()
    .withMessage("Street is required"),

  body("shippingAddress.apartment")
    .notEmpty()
    .withMessage("Apartment is required"),

  body("shippingAddress.area")
    .notEmpty()
    .withMessage("Area is required"),

  body("shippingAddress.city")
    .notEmpty()
    .withMessage("City is required"),

  body("shippingAddress.state")
    .notEmpty()
    .withMessage("State is required"),

  body("shippingAddress.zip")
    .notEmpty()
    .withMessage("Zip code is required"),

  body("shippingAddress.country")
    .notEmpty()
    .withMessage("Country is required"),

  body("shippingAddress.addressType")
    .notEmpty()
    .withMessage("Address type is required"),
];

const paymentRules = [
  body("paymentMethod")
    .notEmpty()
    .withMessage("paymentMethod is required")
    .isIn(["COD", "Card", "Wallet", "PayPal"])
    .withMessage("Invalid paymentMethod"),
];

const createOrderRules = [...orderItemRules, ...addressRules, ...paymentRules];

const statusUpdateRules = [
  body("orderStatus")
    .notEmpty()
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid orderStatus"),
];

const paymentUpdateRules = [
  body("paymentStatus")
    .notEmpty()
    .isIn(["pending", "paid", "failed", "refunded"])
    .withMessage("Invalid paymentStatus"),
];

module.exports = {
  createOrderRules,
  statusUpdateRules,
  paymentUpdateRules,
};
