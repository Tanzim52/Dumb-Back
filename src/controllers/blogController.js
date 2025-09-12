const Blog = require("../models/blog");

// @desc    Create new blog
// @route   POST /api/blogs
// @access  Private (Admin only)
const createBlog = async (req, res, next) => {
  try {
    const { title, excerpt, readTime, category, image, hoverText } = req.body;

    if (!title || !excerpt || !readTime || !category || !image) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const blog = await Blog.create({
      title,
      excerpt,
      readTime,
      category,
      image,
      hoverText,
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
const getBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, count: blogs.length, data: blogs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single blog by id
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private (Admin only)
const updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.json({ success: true, message: "Blog updated", data: blog });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private (Admin only)
const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    res.json({ success: true, message: "Blog deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
};
