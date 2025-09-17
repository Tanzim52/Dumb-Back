const express = require("express");
const router = express.Router();
const categoryCtrl = require("../controllers/categoryController");
const { categoryValidator } = require("../validators/categoryValidator");
const validateRequest = require("../middlewares/validateRequest");

// CRUD
router.post(
  "/",
  validateRequest,
  categoryValidator,
  categoryCtrl.createCategory
);
router.get("/", categoryCtrl.getCategories);
router.get("/:id", categoryCtrl.getCategoryById);
router.put("/:id", categoryCtrl.updateCategory);
router.delete("/:id", categoryCtrl.deleteCategory);

// Subcategory routes
router.post("/:id/subcategories", categoryCtrl.addSubCategory);
router.put("/:id/subcategories/:subId", categoryCtrl.updateSubCategory);
router.delete("/:id/subcategories/:subId", categoryCtrl.deleteSubCategory);
router.post("/:id/subcategories/reorder", categoryCtrl.reorderSubCategories);
router.post("/subcategories/move", categoryCtrl.moveSubCategory);

// Child category routes
router.post(
  "/:id/subcategories/:subId/children",
  categoryCtrl.addChildCategory
);
router.put(
  "/:id/subcategories/:subId/children/:childId",
  categoryCtrl.updateChildCategory
);
router.delete(
  "/:id/subcategories/:subId/children/:childId",
  categoryCtrl.deleteChildCategory
);
router.post(
  "/:id/subcategories/:subId/children/reorder",
  categoryCtrl.reorderChildCategories
);
router.post("/children/move", categoryCtrl.moveChildCategory);

// Utility - support path, path/:subId and path/:subId/:childId
router.get("/:id/path", categoryCtrl.findPath);
router.get("/:id/path/:subId", categoryCtrl.findPath);
router.get("/:id/path/:subId/:childId", categoryCtrl.findPath);

module.exports = router;
