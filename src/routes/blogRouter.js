const express = require("express");
const {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} = require("../controllers/blogController");
const protect = require("../middlewares/userAuthMiddleware");
const { blogValidation } = require("../validators/blogValidator");
const validateRequest = require("../middlewares/validateRequest");

const router = express.Router();

// Public
router.get("/", getBlogs);
router.get("/:id", getBlogById);

// Private (Admin only - for now using just protect, later we can add role check)
router.post("/", blogValidation, validateRequest, protect, createBlog);
router.put("/:id", blogValidation, validateRequest, protect, updateBlog);
router.delete("/:id", protect, deleteBlog);

module.exports = router;
