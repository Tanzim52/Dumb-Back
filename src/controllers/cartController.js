const Cart = require("../models/cart");
const Product = require("../models/product");

// Add product to cart
const createCart = async (req, res, next) => {
  try {
    const { user, product, quantity, size, color } = req.body;

    console.log(quantity);

    // ✅ Ensure product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const productPrice = productDoc.discount_price || productDoc.price;

    // Treat product + size + color as unique key for cart items
    const query = { user, product, size: size || null, color: color || null };

    // ✅ Check if item already exists in cart (same size/color)
    let cartItem = await Cart.findOne(query);
    if (cartItem) {
      cartItem.quantity += quantity || 1;
      cartItem.priceAtTime = productPrice; // update latest price
      await cartItem.save();
      return res.status(200).json({ success: true, data: cartItem });
    }

    // If item exists with same product but different options, keep separate entry.
    // ✅ Add new item to cart
    const newCartItem = await Cart.create({
      user,
      product,
      size: size || null,
      color: color || null,
      quantity: quantity || 1,
      priceAtTime: productPrice,
    });

    res.status(201).json({ success: true, data: newCartItem });
  } catch (error) {
    next(error);
  }
};

// Get user cart
const getCart = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });

    const cartItems = await Cart.find({ user: userId })
      .populate("product")
      .populate("user", "fullName email");

    let subtotal = 0;
    let totalItems = 0;
    cartItems.forEach((item) => {
      subtotal += item.quantity * item.priceAtTime;
      totalItems += item.quantity;
    });

    res.status(200).json({
      success: true,
      data: cartItems,
      summary: {
        totalItems,
        subtotal,
        tax: +(subtotal * 0.1).toFixed(2), // Example 10% tax
        grandTotal: +(subtotal * 1.1).toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update quantity
const updateCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, size, color } = req.body;

    // Validate quantity when provided
    if (
      quantity !== undefined &&
      (!Number.isInteger(quantity) || quantity < 1)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be an integer >= 1" });
    }

    const current = await Cart.findById(id);
    if (!current)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    // If size/color changed, we may need to merge into existing item with same product+options
    const newSize = size !== undefined ? size : current.size;
    const newColor = color !== undefined ? color : current.color;

    // Check for an existing item (excluding the one we're updating)
    const existing = await Cart.findOne({
      user: current.user,
      product: current.product,
      size: newSize || null,
      color: newColor || null,
      _id: { $ne: current._id },
    });

    if (existing) {
      // Merge: increment existing quantity and remove current
      if (quantity !== undefined) existing.quantity += quantity;
      else existing.quantity += current.quantity;
      // keep latest price
      existing.priceAtTime = current.priceAtTime;
      await existing.save();
      await current.remove();
      const populated = await existing.populate("product");
      return res.status(200).json({ success: true, data: populated });
    }

    // Otherwise update in place
    if (quantity !== undefined) current.quantity = quantity;
    if (size !== undefined) current.size = size;
    if (color !== undefined) current.color = color;
    await current.save();
    const populated = await current.populate("product");
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// Remove one item
const deleteCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cartItem = await Cart.findByIdAndDelete(id);
    if (!cartItem)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    res.status(200).json({ success: true, message: "Item removed" });
  } catch (error) {
    next(error);
  }
};

// Empty cart
const emptyCart = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });

    const result = await Cart.deleteMany({ user: userId });
    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

// Merge guest cart into user cart
const mergeGuestCart = async (req, res, next) => {
  try {
    const { userId, guestCart } = req.body; // guestCart = array [{product, quantity}]
    if (!userId || !Array.isArray(guestCart)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payload" });
    }

    for (const item of guestCart) {
      const productDoc = await Product.findById(item.product);
      if (!productDoc) continue;

      const size = item.size || null;
      const color = item.color || null;

      let cartItem = await Cart.findOne({
        user: userId,
        product: item.product,
        size,
        color,
      });
      if (cartItem) {
        cartItem.quantity += item.quantity;
        cartItem.priceAtTime = productDoc.discount_price || productDoc.price;
        await cartItem.save();
      } else {
        await Cart.create({
          user: userId,
          product: item.product,
          size,
          color,
          quantity: item.quantity,
          priceAtTime: productDoc.discount_price || productDoc.price,
        });
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Guest cart merged successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCart,
  getCart,
  updateCartItem,
  deleteCartItem,
  emptyCart,
  mergeGuestCart,
};
