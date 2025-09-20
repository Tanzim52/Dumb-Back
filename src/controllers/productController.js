const { validationResult } = require("express-validator");
const Product = require("../models/product");

function buildFilters(q) {
  const filter = {};
  if (q.category) filter.category = q.category;
  if (q.brand) filter.brand = q.brand;
  if (q.is_deal != null)
    filter.is_deal = q.is_deal === true || q.is_deal === "true";
  if (q.is_best_seller != null)
    filter.is_best_seller =
      q.is_best_seller === true || q.is_best_seller === "true";
  if (q.is_new_arrival != null)
    filter.is_new_arrival =
      q.is_new_arrival === true || q.is_new_arrival === "true";
  if (q.minPrice != null || q.maxPrice != null) {
    filter.price = {};
    if (q.minPrice != null) filter.price.$gte = Number(q.minPrice);
    if (q.maxPrice != null) filter.price.$lte = Number(q.maxPrice);
  }
  if (q.tags) {
    const arr = q.tags
      .split("|")
      .map((t) => t.trim())
      .filter(Boolean);
    if (arr.length) filter["metadata.tags"] = { $in: arr };
  }
  return filter;
}

exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const payload = { ...req.body };

    if (payload.id != null) {
      payload.externalId = payload.id;
      delete payload.id;
    }

    if (payload.sku) payload.sku = String(payload.sku).toUpperCase();

    const doc = await Product.create(payload);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.sku) {
      return res.status(409).json({ success: false, message: "SKU already exists" });
    }
    next(err);
  }
};


exports.upsertBulk = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.products) ? req.body.products : [];
    if (!items.length)
      return res
        .status(400)
        .json({ success: false, message: "products: [] required" });

    let inserted = 0,
      updated = 0,
      failed = 0;
    const errors = [];

    for (const raw of items) {
      try {
        const payload = { ...raw };
        if (payload.id != null) {
          payload.externalId = payload.id;
          delete payload.id;
        }
        if (payload.sku) payload.sku = String(payload.sku).toUpperCase();

        const existing = await Product.findOne({ sku: payload.sku });
        if (existing) {
          await Product.updateOne(
            { _id: existing._id },
            { $set: payload },
            { runValidators: true }
          );
          updated += 1;
        } else {
          await Product.create(payload); // model hooks & validation run
          inserted += 1;
        }
      } catch (e) {
        failed += 1;
        errors.push({ sku: raw?.sku, error: e.message });
      }
    }

    res.json({ success: true, result: { inserted, updated, failed, errors } });
  } catch (err) {
    next(err);
  }
};

exports.listProducts = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const skip = (page - 1) * limit;

    const filter = buildFilters(req.query);
    let find = Product.find(filter);

    if (req.query.search) {
      find = Product.find({ $text: { $search: req.query.search }, ...filter });
    }

    // sorting
    const sort = (req.query.sort || "").toLowerCase();
    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      newest: { added_date: -1, createdAt: -1 },
      top_rated: { "metadata.rating": -1 },
    };
    const sortSpec = sortMap[sort] || { createdAt: -1 };

    const [items, total] = await Promise.all([
      find.sort(sortSpec).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Product.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.getBySku = async (req, res, next) => {
  try {
    const doc = await Product.findOne({
      sku: String(req.params.sku).toUpperCase(),
    });
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const doc = await Product.findOne({ slug: req.params.slug.toLowerCase() });
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const update = { ...req.body };
    if (update.id != null) {
      update.externalId = update.id;
      delete update.id;
    }
    if (update.sku) update.sku = String(update.sku).toUpperCase();

    const doc = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.sku) {
      return res
        .status(409)
        .json({ success: false, message: "SKU already exists" });
    }
    next(err);
  }
};

exports.removeProduct = async (req, res, next) => {
  try {
    const doc = await Product.findByIdAndDelete(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

// Get flash sale items (MVC controller)
async function getFlashSale(req, res, next) {
  try {
    const items = await Product.find({ is_deal: true })
      .sort({ added_date: -1 })
      .limit(12)
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    return next(err);
  }
}

// Get new arrivals
async function getNewArrivals(req, res, next) {
  try {
    const items = await Product.find({ is_new_arrival: true })
      .sort({ added_date: -1 })
      .limit(12)
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    return next(err);
  }
}

// Get best sellers
async function getBestSellers(req, res, next) {
  try {
    const items = await Product.find({ is_best_seller: true })
      .sort({ added_date: -1 })
      .limit(12)
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createProduct: exports.createProduct,
  upsertBulk: exports.upsertBulk,
  listProducts: exports.listProducts,
  getById: exports.getById,
  getBySku: exports.getBySku,
  getBySlug: exports.getBySlug,
  updateProduct: exports.updateProduct,
  removeProduct: exports.removeProduct,
  getFlashSale,
  getNewArrivals,
  getBestSellers,
};
