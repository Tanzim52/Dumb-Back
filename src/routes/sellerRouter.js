// src/routes/sellerRouter.js
const express = require("express");
const ctrl = require("../controllers/sellerController");
const validate = require("../validators/sellerValidator");
const validateRequest = require("../middlewares/validateRequest");
const { authenticateSeller } = require("../middlewares/sellerAuthMiddleware");
const router = express.Router();

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
  authenticateSeller,
  validate.additionalInfoValidation,
  validateRequest,
  ctrl.registerAdditionalInfo
);
router.post(
  "/register/business",
  authenticateSeller,
  validate.businessValidation,
  validateRequest,
  ctrl.registerBusiness
);

router.post(
  "/register/documents",
  authenticateSeller,
  validate.documentsValidation,
  validateRequest,
  ctrl.registerDocuments
);
router.post(
  "/register/payout",
  authenticateSeller,
  validate.payoutValidation,
  validateRequest,
  ctrl.registerPayout
);
router.post(
  "/register/tax",
  authenticateSeller,
  validate.taxInfoValidation,
  validateRequest,
  ctrl.registerTaxInfo
);
router.post(
  "/register/return",
  authenticateSeller,
  validate.returnPolicyValidation,
  validateRequest,
  ctrl.registerReturnPolicy
);
router.post(
  "/register/plan",
  authenticateSeller,
  validate.planValidation,
  validateRequest,
  ctrl.registerPlan
);
router.post("/register/submit", authenticateSeller, ctrl.registerSubmit);

module.exports = router;
