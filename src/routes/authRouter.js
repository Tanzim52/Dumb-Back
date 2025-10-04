const express = require("express");
const ctrl = require("../controllers/authController");
const validate = require("../validators/authValidator");
const auth = require("../middlewares/authMiddleware"); // ✅ fixed import
const validateRequest = require("../middlewares/validateRequest");

const router = express.Router();

// Public routes
router.post(
  "/register/start",
  validate.registerStartValidation,
  validateRequest,
  ctrl.registerStart
);
router.post(
  "/register/google",
  validate.googleLoginValidation,
  validateRequest,
  ctrl.googleAuth
);
router.post(
  "/register/verify",
  validate.verifyEmailValidation,
  validateRequest,
  ctrl.verifyEmail
);
router.post(
  "/forgot/start",
  validate.forgotPasswordStartValidation,
  validateRequest,
  ctrl.forgotPasswordStart
);
router.post(
  "/forgot/verify",
  validate.forgotPasswordVerifyValidation,
  validateRequest,
  ctrl.forgotPasswordVerify
);
router.post("/login", validate.loginValidation, validateRequest, ctrl.login);



// Protected routes

router.get(
  "/user/byEmail/:email",
  validate.userValidation,
  validateRequest,
  auth,
  ctrl.getUserByEmail
);
router.patch(
  "/user-update",
  validate.updateProfileValidation,
  validateRequest,
  auth,
  ctrl.updateProfile
);
router.patch(
  "/change-password",
  validate.changePasswordValidation,
  validateRequest,
  auth,
  ctrl.changePassword
);
router.patch(
  "/change-email/start",
  validate.changeEmailStartValidation,
  validateRequest,
  auth,
  ctrl.changeEmailStart
);
router.patch(
  "/change-email/verify",
  validate.changeEmailVerifyValidation,
  validateRequest,
  auth,
  ctrl.changeEmailVerify
);

module.exports = router;
