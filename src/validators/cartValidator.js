const { body } = require("express-validator");

const cartValidation = [
  body("user")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User must be a valid MongoDB ID"),

  body("product")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Product must be a valid MongoDB ID"),

  body("quantity")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Quantity must be greater than 0"),

  body("priceAtTime")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Price must be greater than 0"),
];

module.exports = { cartValidation };
