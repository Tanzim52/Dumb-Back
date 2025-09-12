const Cart = require("../models/cart");
const Product = require("../models/product");

// Add product to cart
const createCart = async (req, res) => {
  try {
    const { user, product, quantity } = req.body;

    // ✅ Ensure product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const productPrice = productDoc.discount_price || productDoc.price;

    // ✅ Check if item already exists in cart
    let cartItem = await Cart.findOne({ user, product });
    if (cartItem) {
      cartItem.quantity += quantity || 1;
      cartItem.priceAtTime = productPrice; // update latest price
      await cartItem.save();
      return res.status(200).json({ success: true, data: cartItem });
    }

    // ✅ Add new item to cart
    const newCartItem = await Cart.create({
      user,
      product,
      quantity: quantity || 1,
      priceAtTime: productPrice, // auto-calculated from Product model
    });

    res.status(201).json({ success: true, data: newCartItem });
  } catch (error) {
    next(error);
  }
};

// Get user cart
const getCart = async (req, res) => {
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
const updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be >= 1" });
    }

    const cartItem = await Cart.findByIdAndUpdate(
      id,
      { quantity },
      { new: true, runValidators: true }
    ).populate("product");

    if (!cartItem)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    res.status(200).json({ success: true, data: cartItem });
  } catch (error) {
    next(error);
  }
};

// Remove one item
const deleteCartItem = async (req, res) => {
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
const mergeGuestCart = async (req, res) => {
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

      let cartItem = await Cart.findOne({
        user: userId,
        product: item.product,
      });
      if (cartItem) {
        cartItem.quantity += item.quantity;
        cartItem.priceAtTime = productDoc.discount_price || productDoc.price;
        await cartItem.save();
      } else {
        await Cart.create({
          user: userId,
          product: item.product,
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
