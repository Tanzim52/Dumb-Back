const { body, param } = require("express-validator");

const registerStartValidation = [
  body("fullName")
    .notEmpty()
    .withMessage("Full Name is required")
    .isLength({ min: 3 }),
  body("email").notEmpty().isEmail().withMessage("Valid email is required"),
  body("phone")
    .notEmpty()
    .withMessage("Phone is required")
    .isMobilePhone()
    .withMessage("Must be a valid phone number"),
  body("password")
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 chars"),
  body("profilePicture")
    .optional()
    .isURL()
    .withMessage("Profile Picture must be a valid URL"),
  body("dob").optional().isISO8601().toDate(),
  body("gender").optional().isIn(["male", "female", "other"]),
  body("addresses")
    .optional()
    .isArray()
    .withMessage("Addresses must be an array"),
  // We can add deeper nested validation later if needed
];

// google login =============================
const googleLoginValidation = [
  body("fullName")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email"),

  body("profilePicture")
    .optional({ checkFalsy: true })
    .isURL()
    .withMessage("Photo must be a valid URL"),
  // phone optional for Google
  body("phone").optional({ checkFalsy: true }),
];

const verifyEmailValidation = [
  body("email").notEmpty().isEmail(),
  body("otp")
    .notEmpty()
    .matches(/^\d{6}$/)
    .withMessage("OTP must be a 6-digit code"),
];

// (Optional) explicit validators for forgot password flows
const forgotPasswordStartValidation = [
  body("email").notEmpty().isEmail().withMessage("Valid email is required"),
];

const forgotPasswordVerifyValidation = [
  body("email").notEmpty().isEmail().withMessage("Valid email is required"),
  body("otp")
    .notEmpty()
    .matches(/^\d{6}$/)
    .withMessage("OTP must be a 6-digit code"),
  body("newPassword")
    .notEmpty()
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

const loginValidation = [
  body("email").notEmpty().isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const userValidation = [
  param("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
];

// 🔹 Update Profile
const updateProfileValidation = [
  body("fullName")
    .optional()
    .isString()
    .isLength({ min: 2 })
    .withMessage("Full name must be at least 2 characters"),
  body("profilePicture")
    .optional()
    .isURL()
    .withMessage("Profile picture must be a valid URL"),
  body("dob").optional().isISO8601().withMessage("Invalid date format for dob"),
  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),
  body("addresses")
    .optional()
    .isArray()
    .withMessage("Addresses must be an array"),
];

// 🔹 Change Password
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// 🔹 Change Email Start
const changeEmailStartValidation = [
  body("newEmail")
    .notEmpty()
    .withMessage("New email is required")
    .isEmail()
    .withMessage("Invalid email format"),
];

// 🔹 Change Email Verify
const changeEmailVerifyValidation = [
  body("newEmail")
    .notEmpty()
    .withMessage("New email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("otp")
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];

module.exports = {
  registerStartValidation,
  verifyEmailValidation,
  forgotPasswordStartValidation,
  forgotPasswordVerifyValidation,
  loginValidation,
  userValidation,
  googleLoginValidation,

  // new ones
  updateProfileValidation,
  changePasswordValidation,
  changeEmailStartValidation,
  changeEmailVerifyValidation,
};
