const { body } = require("express-validator");

const blogValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5 })
    .withMessage("Title must be at least 5 characters"),
  body("excerpt")
    .notEmpty()
    .withMessage("Excerpt is required")
    .isLength({ max: 200 })
    .withMessage("Excerpt must not exceed 200 characters"),
  body("readTime")
    .notEmpty()
    .withMessage("Read time is required")
    .matches(/^\d+\s(min|mins|min read)$/i)
    .withMessage("Read time must be like '5 min read'"),
  body("category").notEmpty().withMessage("Category is required"),
  body("image")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Image must be a valid URL"),
  body("hoverText")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Hover text must not exceed 100 characters"),
];

module.exports = { blogValidation };
