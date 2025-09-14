const Wishlist = require("../models/wishlist");

// Helpers: assumes req.user.id is set by auth middleware
async function addToWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { product, note, priceAtAdd } = req.body;
    if (!product)
      return res.status(400).json({ message: "Product is required" });

    // Try create; if duplicate, return existing (or update note/price)
    try {
      const item = await Wishlist.create({
        user: userId,
        product,
        note,
        priceAtAdd,
      });
      const populated = await item.populate("product").execPopulate();
      return res.status(201).json(populated);
    } catch (err) {
      // duplicate key -> update note/price/timestamps (idemp.)
      if (err.code === 11000) {
        const updated = await Wishlist.findOneAndUpdate(
          { user: userId, product },
          {
            note: note || undefined,
            priceAtAdd: priceAtAdd || undefined,
            isActive: true,
            updatedAt: Date.now(),
          },
          { new: true }
        ).populate("product");
        return res.status(200).json(updated);
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function listWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit || 20, 10))
    );
    const skip = (page - 1) * limit;

    const query = { user: userId, isActive: true };

    const [items, total] = await Promise.all([
      Wishlist.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("product")
        .lean(),
      Wishlist.countDocuments(query),
    ]);

    return res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    });
  } catch (err) {
    next(err);
  }
}

async function getWishlistItem(req, res, next) {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const item = await Wishlist.findOne({ _id: id, user: userId }).populate(
      "product"
    );
    if (!item)
      return res.status(404).json({ message: "Wishlist item not found" });
    return res.json(item);
  } catch (err) {
    next(err);
  }
}

async function removeWishlistItem(req, res, next) {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    // Hard delete
    const removed = await Wishlist.findOneAndDelete({ _id: id, user: userId });
    if (!removed)
      return res.status(404).json({ message: "Wishlist item not found" });
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function removeByProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;
    const removed = await Wishlist.findOneAndDelete({
      user: userId,
      product: productId,
    });
    if (!removed)
      return res.status(404).json({ message: "Wishlist item not found" });
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function clearWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    await Wishlist.deleteMany({ user: userId });
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function toggleWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { product } = req.body;
    if (!product)
      return res.status(400).json({ message: "Product is required" });

    const existing = await Wishlist.findOne({ user: userId, product });
    if (!existing) {
      const created = await Wishlist.create({ user: userId, product });
      return res
        .status(201)
        .json(await created.populate("product").execPopulate());
    }
    // Toggle isActive
    existing.isActive = !existing.isActive;
    await existing.save();
    return res.json(await existing.populate("product").execPopulate());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addToWishlist,
  listWishlist,
  getWishlistItem,
  removeWishlistItem,
  removeByProduct,
  clearWishlist,
  toggleWishlist,
};
