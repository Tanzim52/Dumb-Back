const { check, param, query, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateAdd = [
  check("product")
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage("Product is required")
    .bail()
    .isMongoId()
    .withMessage("Invalid product id"),
  check("note")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Note must be at most 500 characters"),
  check("priceAtAdd")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("priceAtAdd must be a positive number"),
  handleValidationErrors,
];

const validateToggle = [
  check("product")
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage("Product is required")
    .bail()
    .isMongoId()
    .withMessage("Invalid product id"),
  handleValidationErrors,
];

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  handleValidationErrors,
];

const validateIdParam = [
  param("id").isMongoId().withMessage("Invalid id parameter"),
  handleValidationErrors,
];

const validateProductParam = [
  param("productId").isMongoId().withMessage("Invalid productId parameter"),
  handleValidationErrors,
];

module.exports = {
  validateAdd,
  validateToggle,
  validatePagination,
  validateIdParam,
  validateProductParam,
  handleValidationErrors,
};
