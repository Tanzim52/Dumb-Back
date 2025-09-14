const express = require("express");
const router = express.Router();
const controller = require("../controllers/wishlistController");
const auth = require("../middlewares/authMiddleware");
const v = require("../validators/wishlistValidator");
const validateRequest = require("../middlewares/validateRequest");
router.use(auth);

router.post("/", v.validateAdd, validateRequest, controller.addToWishlist);
router.post(
  "/toggle",
  v.validateToggle,
  validateRequest,
  controller.toggleWishlist
);
router.get("/", v.validatePagination, validateRequest, controller.listWishlist);
router.get(
  "/:id",
  v.validateIdParam,
  validateRequest,
  controller.getWishlistItem
);
router.delete(
  "/:id",
  v.validateIdParam,
  validateRequest,
  controller.removeWishlistItem
);
router.delete(
  "/product/:productId",
  v.validateProductParam,
  validateRequest,
  controller.removeByProduct
);
router.delete("/", validateRequest, controller.clearWishlist);

module.exports = router;
