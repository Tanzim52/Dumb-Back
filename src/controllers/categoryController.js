const Category = require("../models/category");

// Helper: simple slug generator
function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Create category
exports.createCategory = async (req, res, next) => {
  try {
    const { id, name, slug } = req.body;
    if (!id || !name) {
      return res
        .status(400)
        .json({ success: false, message: "`id` and `name` are required" });
    }
    const payload = {
      id,
      name,
      slug: slug ? slugify(slug) : slugify(name),
      subCategories: req.body.subCategories || [],
    };
    const exists = await Category.findOne({ id });
    if (exists) {
      return res
        .status(409)
        .json({
          success: false,
          message: "Category with this id already exists",
        });
    }
    const category = await Category.create(payload);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// List categories with optional search & pagination
exports.getCategories = async (req, res, next) => {
  try {
    const {
      q,
      page = 1,
      limit = 25,
      sortBy = "createdAt",
      order = -1,
    } = req.query;
    const filter = {};
    if (q) {
      const re = new RegExp(q, "i");
      filter.$or = [{ name: re }, { slug: re }, { id: re }];
    }
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const total = await Category.countDocuments(filter);
    const categories = await Category.find(filter)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({
      success: true,
      data: categories,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

// Get category by id
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findOne({ id: req.params.id });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Update category (top-level)
exports.updateCategory = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.slug) updates.slug = slugify(req.body.slug);
    if (req.body.id && req.body.id !== req.params.id) {
      // ensure id uniqueness if changing id
      const exists = await Category.findOne({ id: req.body.id });
      if (exists)
        return res
          .status(409)
          .json({ success: false, message: "id already in use" });
      updates.id = req.body.id;
    }
    const category = await Category.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Delete category
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({ id: req.params.id });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    next(err);
  }
};

// --- Subcategory CRUD ---

// Add subcategory to a category
exports.addSubCategory = async (req, res, next) => {
  try {
    const { name, id, slug } = req.body;
    if (!id || !name)
      return res
        .status(400)
        .json({
          success: false,
          message: "`id` and `name` required for subcategory",
        });
    const category = await Category.findOne({ id: req.params.id });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    // prevent duplicate subcategory id
    if (category.subCategories.some((sc) => sc.id === id)) {
      return res
        .status(409)
        .json({ success: false, message: "Subcategory id already exists" });
    }
    const sub = {
      id,
      name,
      slug: slug ? slugify(slug) : slugify(name),
      childCategories: [],
    };
    category.subCategories.push(sub);
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Update subcategory
exports.updateSubCategory = async (req, res, next) => {
  try {
    const { catId, subId } = { catId: req.params.id, subId: req.params.subId };
    const { name, slug, id: newId } = req.body;
    const category = await Category.findOne({ id: catId });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    const sub = category.subCategories.find((s) => s.id === subId);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found" });
    if (newId && newId !== subId) {
      if (category.subCategories.some((s) => s.id === newId)) {
        return res
          .status(409)
          .json({ success: false, message: "Subcategory id already exists" });
      }
      sub.id = newId;
    }
    if (name) sub.name = name;
    if (slug) sub.slug = slugify(slug);
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Delete subcategory
exports.deleteSubCategory = async (req, res, next) => {
  try {
    const { id, subId } = { id: req.params.id, subId: req.params.subId };
    const category = await Category.findOne({ id });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    const idx = category.subCategories.findIndex((s) => s.id === subId);
    if (idx === -1)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found" });
    category.subCategories.splice(idx, 1);
    await category.save();
    res.json({ success: true, message: "Subcategory deleted", data: category });
  } catch (err) {
    next(err);
  }
};

// Reorder subcategories (receive ordered array of subcategory ids)
exports.reorderSubCategories = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { order } = req.body; // e.g. ["sub1","sub3","sub2"]
    if (!Array.isArray(order))
      return res
        .status(400)
        .json({
          success: false,
          message: "order must be an array of subcategory ids",
        });
    const category = await Category.findOne({ id });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    const map = new Map(category.subCategories.map((sc) => [sc.id, sc]));
    const newSubs = [];
    for (const sid of order) {
      if (map.has(sid)) newSubs.push(map.get(sid));
    }
    // append any missing ones at the end in their previous order
    for (const sc of category.subCategories)
      if (!order.includes(sc.id)) newSubs.push(sc);
    category.subCategories = newSubs;
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Move subcategory from one category to another
exports.moveSubCategory = async (req, res, next) => {
  try {
    const { fromCatId, subId, toCatId } = req.body;
    if (!fromCatId || !subId || !toCatId)
      return res
        .status(400)
        .json({
          success: false,
          message: "fromCatId, subId and toCatId required",
        });
    const from = await Category.findOne({ id: fromCatId });
    const to = await Category.findOne({ id: toCatId });
    if (!from || !to)
      return res
        .status(404)
        .json({
          success: false,
          message: "Source or destination category not found",
        });
    const idx = from.subCategories.findIndex((s) => s.id === subId);
    if (idx === -1)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found in source" });
    const [sub] = from.subCategories.splice(idx, 1);
    // ensure id doesn't clash in destination
    if (to.subCategories.some((s) => s.id === sub.id))
      return res
        .status(409)
        .json({
          success: false,
          message: "Destination already has a subcategory with same id",
        });
    to.subCategories.push(sub);
    await from.save();
    await to.save();
    res.json({
      success: true,
      message: "Subcategory moved",
      data: { from, to },
    });
  } catch (err) {
    next(err);
  }
};

// --- Child Category CRUD ---

// Add child category to a subcategory
exports.addChildCategory = async (req, res, next) => {
  try {
    const { id: catId, subId } = req.params;
    const { id, name, slug } = req.body;
    if (!id || !name)
      return res
        .status(400)
        .json({
          success: false,
          message: "`id` and `name` required for child category",
        });
    const category = await Category.findOne({ id: catId });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    const sub = category.subCategories.find((s) => s.id === subId);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found" });
    if (sub.childCategories.some((c) => c.id === id))
      return res
        .status(409)
        .json({ success: false, message: "Child category id already exists" });
    const child = { id, name, slug: slug ? slugify(slug) : slugify(name) };
    sub.childCategories.push(child);
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Update child category
exports.updateChildCategory = async (req, res, next) => {
  try {
    const { id: catId, subId, childId } = req.params;
    const { name, slug, id: newId } = req.body;
    const category = await Category.findOne({ id: catId });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    const sub = category.subCategories.find((s) => s.id === subId);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found" });
    const child = sub.childCategories.find((c) => c.id === childId);
    if (!child)
      return res
        .status(404)
        .json({ success: false, message: "Child category not found" });
    if (newId && newId !== childId) {
      if (sub.childCategories.some((c) => c.id === newId))
        return res
          .status(409)
          .json({ success: false, message: "Child id already exists" });
      child.id = newId;
    }
    if (name) child.name = name;
    if (slug) child.slug = slugify(slug);
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Delete child category
exports.deleteChildCategory = async (req, res, next) => {
  try {
    const { id: catId, subId, childId } = req.params;
    const category = await Category.findOne({ id: catId });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    const sub = category.subCategories.find((s) => s.id === subId);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found" });
    const idx = sub.childCategories.findIndex((c) => c.id === childId);
    if (idx === -1)
      return res
        .status(404)
        .json({ success: false, message: "Child category not found" });
    sub.childCategories.splice(idx, 1);
    await category.save();
    res.json({
      success: true,
      message: "Child category deleted",
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

// Reorder child categories within a subcategory
exports.reorderChildCategories = async (req, res, next) => {
  try {
    const { id: catId, subId } = req.params;
    const { order } = req.body; // array of child ids
    if (!Array.isArray(order))
      return res
        .status(400)
        .json({
          success: false,
          message: "order must be an array of child ids",
        });
    const category = await Category.findOne({ id: catId });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    const sub = category.subCategories.find((s) => s.id === subId);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found" });
    const map = new Map(sub.childCategories.map((c) => [c.id, c]));
    const newChildren = [];
    for (const cid of order) if (map.has(cid)) newChildren.push(map.get(cid));
    for (const c of sub.childCategories)
      if (!order.includes(c.id)) newChildren.push(c);
    sub.childCategories = newChildren;
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// Move child category between subcategories (within same category or across categories)
exports.moveChildCategory = async (req, res, next) => {
  try {
    const { fromCatId, fromSubId, childId, toCatId, toSubId } = req.body;
    if (!fromCatId || !fromSubId || !childId || !toCatId || !toSubId)
      return res
        .status(400)
        .json({
          success: false,
          message:
            "fromCatId, fromSubId, childId, toCatId and toSubId required",
        });
    const fromCat = await Category.findOne({ id: fromCatId });
    const toCat = await Category.findOne({ id: toCatId });
    if (!fromCat || !toCat)
      return res
        .status(404)
        .json({
          success: false,
          message: "Source or destination category not found",
        });
    const fromSub = fromCat.subCategories.find((s) => s.id === fromSubId);
    const toSub = toCat.subCategories.find((s) => s.id === toSubId);
    if (!fromSub || !toSub)
      return res
        .status(404)
        .json({
          success: false,
          message: "Source or destination subcategory not found",
        });
    const idx = fromSub.childCategories.findIndex((c) => c.id === childId);
    if (idx === -1)
      return res
        .status(404)
        .json({
          success: false,
          message: "Child category not found in source",
        });
    const [child] = fromSub.childCategories.splice(idx, 1);
    if (toSub.childCategories.some((c) => c.id === child.id))
      return res
        .status(409)
        .json({
          success: false,
          message: "Destination already has a child with same id",
        });
    toSub.childCategories.push(child);
    await fromCat.save();
    if (toCat.id !== fromCat.id) await toCat.save();
    res.json({
      success: true,
      message: "Child category moved",
      data: { fromCat, toCat },
    });
  } catch (err) {
    next(err);
  }
};

// Utility: find subcategory or child by ids
exports.findPath = async (req, res, next) => {
  try {
    const { id: catId, subId, childId } = req.params;
    const category = await Category.findOne({ id: catId });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    if (!subId) return res.json({ success: true, data: { category } });
    const sub = category.subCategories.find((s) => s.id === subId);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subcategory not found" });
    if (!childId) return res.json({ success: true, data: { category, sub } });
    const child = sub.childCategories.find((c) => c.id === childId);
    if (!child)
      return res
        .status(404)
        .json({ success: false, message: "Child not found" });
    res.json({ success: true, data: { category, sub, child } });
  } catch (err) {
    next(err);
  }
};

// Additional helpers could be added (bulk import/export, sync with products, etc.)
