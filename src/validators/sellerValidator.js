// src/validators/sellerValidator.js
const { body } = require("express-validator");

const registerStartValidation = [
  body("sellerInfo.email").isEmail().withMessage("Valid email required"),
  body("sellerInfo.phone").notEmpty().withMessage("Phone is required"),
];


const verifyEmailValidation = [
  body("email").isEmail().withMessage("Valid email required"),
  body("otp").notEmpty().withMessage("OTP required"),
  body("sellerInfo.password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("sellerInfo.acceptTerms")
    .isBoolean()
    .withMessage("Accept terms required"),
  body("type").notEmpty().withMessage("Type is required"),
  body("plan").notEmpty().withMessage("Plan is required"),
];


const additionalInfoValidation = [
  body("additionalInfo.fullName")
    .notEmpty()
    .withMessage("Full name required"),
  body("additionalInfo.businessName")
    .notEmpty()
    .withMessage("Business name required"),
  body("additionalInfo.businessType")
    .notEmpty()
    .withMessage("Business type required"),
  body("additionalInfo.storeName")
    .notEmpty()
    .withMessage("Store name required"),
  body("additionalInfo.country")
    .notEmpty()
    .withMessage("Country required"),
  body("additionalInfo.currency")
    .notEmpty()
    .withMessage("Currency required"),
  body("additionalInfo.pickupStreet")
    .notEmpty()
    .withMessage("Pickup street required"),
  body("additionalInfo.pickupArea")
    .notEmpty()
    .withMessage("Pickup area required"),
  body("additionalInfo.pickupCity")
    .notEmpty()
    .withMessage("Pickup city required"),
  body("additionalInfo.pickupState")
    .notEmpty()
    .withMessage("Pickup state required"),
  body("additionalInfo.pinCode")
    .notEmpty()
    .withMessage("PIN code required"),
];

const businessValidation = [
  body("businessInfo.businessType")
    .notEmpty()
    .withMessage("Business type is required"),
  body("businessInfo.businessWebsite")
    .notEmpty()
    .withMessage("Business website is required")
    .isURL()
    .withMessage("Business website must be a valid URL"),
  body("businessInfo.primaryCategory")
    .notEmpty()
    .withMessage("Primary category is required"),
  body("businessInfo.registrationNumber")
    .notEmpty()
    .withMessage("Registration number is required"),
  body("businessInfo.taxId")
    .notEmpty()
    .withMessage("Tax ID is required"),
  body("businessInfo.businessDescription")
    .notEmpty()
    .withMessage("Business description is required"),
];

const documentsValidation = [
  body("identityInfo.idType").notEmpty().withMessage("ID type required"),
  body("identityInfo.governmentIdUrl").notEmpty().withMessage("Government ID URL required"),
  body("identityInfo.selfieUrl").notEmpty().withMessage("Selfie URL required"),
];


const payoutValidation = [
  body("payoutInfo.payoutMethod")
    .notEmpty()
    .withMessage("Payout method required"),
  body("payoutInfo.accountHolderName")
    .notEmpty()
    .withMessage("Account holder name required"),
  body("payoutInfo.accountNumber")
    .notEmpty()
    .withMessage("Account number required"),
  body("payoutInfo.bankName")
    .notEmpty()
    .withMessage("Bank name required"),
  body("payoutInfo.routingNumber")
    .optional()
    .isString()
    .withMessage("Routing number must be a string"),
];

const taxInfoValidation = [
  body("taxInfo.taxFormType")
    .notEmpty()
    .withMessage("Tax form type required"),
  body("taxInfo.taxDocumentUrl")
    .notEmpty()
    .withMessage("Tax document URL required")
    .isURL()
    .withMessage("Must be a valid URL"),
];
const returnPolicyValidation = [
  body("returnPolicy.returnPolicy")
    .notEmpty()
    .withMessage("Return policy duration is required"),

  body("returnPolicy.handlingTime")
    .notEmpty()
    .withMessage("Handling time is required"),

  body("returnPolicy.logisticsMethod")
    .notEmpty()
    .withMessage("Logistics method is required"),

  body("returnPolicy.shippingRegions")
    .isArray({ min: 1 })
    .withMessage("Shipping regions must be an array with at least one region"),

  body("returnPolicy.shippingRegions.*")
    .notEmpty()
    .withMessage("Each shipping region must be a non-empty string")
];
const planValidation = [
  body("plan.id")
    .isIn(["free", "growth", "premium"])
    .withMessage("Invalid plan"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

const updateProfileValidation = [
  body("businessName").optional().isString(),
  body("storeName").optional().isString(),
  body("fullName").optional().isString(),
];

const changePasswordValidation = [
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 6 }),
];

const changeEmailStartValidation = [
  body("newEmail").isEmail().withMessage("Valid email required"),
];
const changeEmailVerifyValidation = [
  body("newEmail").isEmail(),
  body("otp").notEmpty(),
];

module.exports = {
  registerStartValidation,
  verifyEmailValidation,
  additionalInfoValidation,
  businessValidation,
  documentsValidation,
  payoutValidation,
  taxInfoValidation,
  returnPolicyValidation,
  planValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  changeEmailStartValidation,
  changeEmailVerifyValidation,
};
