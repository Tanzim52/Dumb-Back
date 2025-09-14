const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/product");
const Cart = require("../models/cart"); // optional: to clear cart after order
const transporter = require("../config/mailer"); // optional email notify
// const sendSms = require("../utils/sendSmsOtp"); // optional sms notify

// Helper: compute item snapshots, check stock and calculate totals
async function buildOrderItems(items) {
  const built = [];
  let subtotal = 0;

  for (const it of items) {
    const p = await Product.findById(it.product);
    if (!p) throw new Error(`Product not found: ${it.product}`);

    const unitPrice = p.discount_price != null ? p.discount_price : p.price;
    const qty = Number(it.quantity);
    if (p.stock_quantity != null && p.stock_quantity < qty) {
      throw new Error(`Insufficient stock for SKU ${p.sku || p._id}`);
    }

    const itemTotal = +(unitPrice * qty);
    subtotal += itemTotal;

    built.push({
      product: p._id,
      name: p.name,
      sku: p.sku,
      priceAtTime: unitPrice,
      quantity: qty,
      itemTotal,
    });
  }

  return { items: built, subtotal };
}

// POST /api/orders
// create order, deduct stock (transactional when possible)
const createOrder = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  // use req.user._id (authMiddleware must have run)
  const userId = req.user._id;

  const {
    items: rawItems,
    shippingAddress,
    paymentMethod,
    shippingFee = 0,
    discount = 0,
    meta,
  } = req.body;

  // Use session/transaction if available
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, subtotal } = await buildOrderItems(rawItems);

    const totalAmount = +(subtotal + Number(shippingFee) - Number(discount));

    // Deduct stock for each product
    for (const it of items) {
      // decrement atomic
      const updated = await Product.findOneAndUpdate(
        {
          _id: it.product,
          stock_quantity: { $gte: it.quantity },
        },
        { $inc: { stock_quantity: -it.quantity } },
        { new: true, session }
      );

      if (!updated)
        throw new Error(`Insufficient stock (race) for product ${it.product}`);
    }

    const order = await Order.create(
      [
        {
          user: userId,
          items,
          shippingAddress,
          paymentMethod,
          subtotal,
          shippingFee: Number(shippingFee),
          discount: Number(discount),
          totalAmount,
          meta,
          paymentStatus: paymentMethod === "COD" ? "pending" : "pending",
          orderStatus: "pending",
          placedAt: new Date(),
        },
      ],
      { session }
    );

    // optionally clear cart for user
    await Cart.deleteMany({ user: userId })
      .session(session)
      .catch(() => {});

    await session.commitTransaction();
    session.endSession();

    const created = order[0];

    // optionally: send confirmation email / SMS
    // transporter.sendMail(...);
    // sendSms(req.user.phone, `Your order ${created._id} placed successfully`);

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    return next(err);
  }
};

// GET /api/orders (admin) - list, with filters
const listOrders = async (req, res, next) => {
  try {
    const { status, user, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.orderStatus = status;
    if (user) filter.user = user;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "fullName email"),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/my - logged-in user's orders
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const items = await Order.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "fullName email"
    );
    if (!order)
      return res.status(404).json({ success: false, message: "Not found" });

    // If user is not admin, ensure belongs to req.user
    if (
      req.user.userType !== "admin" &&
      String(order.user._id) !== String(req.user._id)
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/status  (admin)
const updateOrderStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { orderStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true, runValidators: true }
    );
    if (!order)
      return res.status(404).json({ success: false, message: "Not found" });

    // If delivered, set deliveredAt
    if (orderStatus === "delivered") {
      order.deliveredAt = new Date();
      await order.save();
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/payment (admin)
const updatePaymentStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { paymentStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    );
    if (!order)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/orders/:id/cancel  (user)
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, message: "Not found" });

    if (
      String(order.user) !== String(req.user._id) &&
      req.user.userType !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel shipped/delivered orders",
      });
    }

    order.orderStatus = "cancelled";
    await order.save();

    // restore stock
    for (const it of order.items) {
      await Product.findByIdAndUpdate(it.product, {
        $inc: { stock_quantity: it.quantity },
      }).catch(() => {});
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  listOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
};
