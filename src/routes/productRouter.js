const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/productController");
const {
  createOrUpdateRules,
  listRules,
} = require("../validators/productValidator");

// Special collection routes (MUST COME FIRST)
router.get("/flash-sale", ctrl.getFlashSale);
router.get("/new-arrivals", ctrl.getNewArrivals);
router.get("/best-sellers", ctrl.getBestSellers);

// Generic routes
router.get("/", listRules, ctrl.listProducts);
router.get("/sku/:sku", ctrl.getBySku);
router.get("/slug/:slug", ctrl.getBySlug);

// ID-based routes (MUST COME AFTER all specific routes)
router.get("/:id", ctrl.getById);

// Create, update, delete operations
router.post("/", createOrUpdateRules, ctrl.createProduct);
router.post("/bulk", ctrl.upsertBulk);
router.put("/:id", createOrUpdateRules, ctrl.updateProduct);
router.delete("/:id", ctrl.removeProduct);

module.exports = router;