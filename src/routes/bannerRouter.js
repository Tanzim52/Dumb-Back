const express = require("express");
const router = express.Router();
const {
  createBanner,
  getBanners,
  getBanner,
  updateBanner,
  deleteBanner,
} = require("../controllers/bannerController");
const { bannerValidation } = require("../validators/bannerValidator");
const validateRequest = require("../middlewares/validateRequest");

// CRUD Routes
router.post("/", bannerValidation, validateRequest, createBanner);
router.get("/", getBanners);
router.get("/:id", getBanner);
router.put("/:id", bannerValidation, validateRequest, updateBanner);
router.delete("/:id", deleteBanner);

module.exports = router;
