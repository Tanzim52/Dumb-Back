const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/sellerController");
const validate = require("../validators/sellerValidator");
const validateRequest = require("../middlewares/validateRequest");
const sellerAuth = require("../middlewares/sellerAuth");
const isAdmin = require("../middlewares/isAdmin");
const { upload, handleMulterError } = require("../config/multerConfig");

// Robustly require the user-auth (admin) middleware regardless of export style
let auth;
try {
  const authModule = require("../middlewares/authMiddleware");
  if (typeof authModule === "function") {
    auth = authModule; // module.exports = function
  } else if (authModule && typeof authModule.protect === "function") {
    auth = authModule.protect; // module.exports = { protect }
  } else if (authModule && typeof authModule.auth === "function") {
    auth = authModule.auth; // alternative naming
  } else {
    console.warn(
      "[sellerRouter] authMiddleware loaded but couldn't find usable function export. " +
      "Expected function or { protect } export."
    );
    auth = (req, res, next) =>
      res.status(500).json({
        success: false,
        message:
          "Server misconfiguration: auth middleware not found. Check ../middlewares/authMiddleware export.",
      });
  }
} catch (err) {
  console.warn(
    "[sellerRouter] Warning: failed to load authMiddleware:",
    err.message
  );
  auth = (req, res, next) =>
    res.status(500).json({
      success: false,
      message:
        "Server misconfiguration: auth middleware missing. Check ../middlewares/authMiddleware file.",
    });
}

/**
 * Public routes
 */
// Register flow
router.post(
  "/register/start",
  validate.registerStartValidation,
  validateRequest,
  ctrl.registerStart
);
router.post(
  "/register/verify-email",
  validate.verifyEmailValidation,
  validateRequest,
  ctrl.verifySellerEmail
);
router.post(
  "/register/basic",
    sellerAuth,
  validate.additionalInfoValidation,
  validateRequest,
  ctrl.registerAdditionalInfo
);
router.post(
  "/register/business",
    sellerAuth,
  validate.businessValidation,
  validateRequest,
  ctrl.registerBusiness
);

router.post(
  "/register/documents",
  sellerAuth,
  validate.documentsValidation,
  validateRequest,
  ctrl.registerDocuments
);
router.post(
  "/register/payout",
  sellerAuth,
  validate.payoutValidation,
  validateRequest,
  ctrl.registerPayout
);
router.post(
  "/register/tax",
  sellerAuth,
  validate.taxInfoValidation,
  validateRequest,
  ctrl.registerTaxInfo
);
router.post(
  "/register/return",
  sellerAuth,
  validate.returnPolicyValidation,
  validateRequest,
  ctrl.registerReturnPolicy
);
router.post(
  "/register/plan",
  sellerAuth,
  validate.planValidation,
  validateRequest,
  ctrl.registerPlan
);
router.post("/register/submit",   sellerAuth, ctrl.registerSubmit);

router.post("/login", validate.loginValidation, validateRequest, ctrl.login);
router.get(
  "/seller/byId",
    sellerAuth,
  validateRequest,
  ctrl.getSellerById
);
router.post(
  "/forgot/start",
  validate.forgotStartValidation,
  validateRequest,
  ctrl.forgotPasswordStart
);
router.post(
  "/forgot/verify",
  validate.forgotVerifyValidation,
  validateRequest,
  ctrl.forgotPasswordVerify
);

/**
 * Seller-protected routes (require seller JWT - sellerAuth)
 */
router.get("/me", sellerAuth, ctrl.getMe);
router.patch(
  "/update",
  sellerAuth,
  validate.updateValidation,
  validateRequest,
  ctrl.updateProfile
);
router.patch(
  "/change-password",
  sellerAuth,
  validate.changePasswordValidation,
  validateRequest,
  ctrl.changePassword
);

// Change email flow (seller)
router.post(
  "/change-email/start",
  sellerAuth,
  validate.changeEmailStartValidation,
  validateRequest,
  ctrl.changeEmailStart
);
router.post(
  "/change-email/verify",
  sellerAuth,
  validate.changeEmailVerifyValidation,
  validateRequest,
  ctrl.changeEmailVerify
);

// Upload documents/logo
router.post(
  "/upload-doc",
  sellerAuth,
  upload.single("file"),
  handleMulterError,
  ctrl.uploadDocuments
);

/**
 * Seller product management (seller token required)
 */
router.post("/products", sellerAuth, ctrl.createProductAsSeller);
router.get("/products", sellerAuth, ctrl.listSellerProducts);
router.put("/products/:id", sellerAuth, ctrl.updateProductAsSeller);
router.delete("/products/:id", sellerAuth, ctrl.deleteProductAsSeller);

/**
 * Seller orders & earnings
 */
router.get("/orders", sellerAuth, ctrl.listSellerOrders);
router.get("/earnings", sellerAuth, ctrl.earningsSummary);

/**
 * Admin routes (require user admin token)
 * Uses the robust 'auth' loaded above (from authMiddleware) + isAdmin
 */
router.get("/", auth, isAdmin, ctrl.listSellers);
router.get(
  "/:id",
  auth,
  isAdmin,
  validate.idParam,
  validateRequest,
  ctrl.getSeller
);
router.patch(
  "/:id/approve",
  auth,
  isAdmin,
  validate.approveValidation,
  validateRequest,
  ctrl.changeSellerStatus
);
router.patch(
  "/:id/suspend",
  auth,
  isAdmin,
  validate.approveValidation,
  validateRequest,
  ctrl.changeSellerStatus
);
router.delete(
  "/:id",
  auth,
  isAdmin,
  validate.idParam,
  validateRequest,
  ctrl.deleteSeller
);

module.exports = router;