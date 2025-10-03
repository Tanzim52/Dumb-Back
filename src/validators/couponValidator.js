// src/validators/couponValidator.js
const { body } = require("express-validator");

exports.couponCreateValidation = [
  body("code").notEmpty().withMessage("Code is required"),
  body("title").notEmpty().withMessage("Title is required"),
  body("type")
    .isIn(["percentage", "fixed", "free_shipping", "bogo"])
    .withMessage("Invalid type"),
  body("value").isNumeric().withMessage("Value must be a number"),
];
