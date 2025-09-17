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
  // optional size and color
  body("size")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Size must be a string up to 100 chars"),
  body("color")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Color must be a string up to 100 chars"),
];

module.exports = { cartValidation };
