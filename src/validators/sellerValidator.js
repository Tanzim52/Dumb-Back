const { body, param, query } = require("express-validator");

const registerValidation = [
  body("businessName").notEmpty().withMessage("Business name required"),
  body("ownerName").notEmpty().withMessage("Owner name required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("phone").notEmpty().withMessage("Phone required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password at least 6 chars"),
  body("businessType").optional().isIn(["individual", "company"]),
  body("address").optional().isObject(),
  body("bankDetails").optional().isObject(),
  body("documents").optional().isObject(),
  body("paymentMethod")
    .optional()
    .isIn(["bank_transfer", "paypal", "stripe", "other"]),
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

const forgotStartValidation = [
  body("email").isEmail().withMessage("Valid email required"),
];
const forgotVerifyValidation = [
  body("email").isEmail().withMessage("Valid email required"),
  body("otp").notEmpty().isLength({ min: 4 }).withMessage("OTP required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password min 6 chars"),
];

const updateValidation = [
  body("businessName").optional().isString(),
  body("ownerName").optional().isString(),
  body("phone").optional().isString(),
  body("address").optional().isObject(),
  body("bankDetails").optional().isObject(),
  body("documents").optional().isObject(),
  body("logoUrl").optional().isURL().withMessage("logo must be a URL"),
];

const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password min 6 chars"),
];

const changeEmailStartValidation = [
  body("newEmail").isEmail().withMessage("Valid email required"),
];
const changeEmailVerifyValidation = [
  body("newEmail").isEmail().withMessage("Valid email required"),
  body("otp").notEmpty().withMessage("OTP required"),
];

const approveValidation = [
  body("status")
    .notEmpty()
    .isIn(["approved", "rejected", "suspended"])
    .withMessage("Invalid status"),
  body("notes").optional().isString(),
];

const idParam = [param("id").isMongoId().withMessage("Invalid id")];

module.exports = {
  registerValidation,
  loginValidation,
  forgotStartValidation,
  forgotVerifyValidation,
  updateValidation,
  changePasswordValidation,
  changeEmailStartValidation,
  changeEmailVerifyValidation,
  approveValidation,
  idParam,
};
