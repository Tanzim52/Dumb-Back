const { body } = require("express-validator");

const bannerValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters long"),
  body("description")
    .optional()
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters long"),
  body("image")
    .notEmpty()
    .withMessage("Image is required")
    .isURL()
    .withMessage("Image must be a valid URL"),
  body("link").optional().isURL().withMessage("Link must be a valid URL"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("priority")
    .optional()
    .isInt()
    .withMessage("Priority must be an integer"),
  body("startDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("startDate must be a valid date"),
  body("endDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("endDate must be a valid date"),
];

module.exports = { bannerValidation };
