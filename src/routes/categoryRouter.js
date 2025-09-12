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

module.exports = router;
