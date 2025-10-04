const express = require("express");
const authRoutes = require("./routes/authRouter");
const errorHandler = require("./middlewares/errorMiddleware");
const blogRoutes = require("./routes/blogRouter");
const productRoutes = require("./routes/productRouter");
const bannerRouter = require("./routes/bannerRouter");
const countdownRouter = require("./routes/countdownRouter");
const cartRouter = require("./routes/cartRouter");
const categoryRoutes = require("./routes/categoryRouter");
const orderRouter = require("./routes/orderRouter");
const sellerRouter = require("./routes/sellerRouter");
const wishlistRouter = require("./routes/wishlist");
const couponRouter = require("./routes/couponRouter");
const cors = require("cors");
const app = express();

app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://byndio.netlify.app",
  "https://byndio2.netlify.app",
   "http://localhost:5000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// ADD THIS ROOT ROUTE - This fixes the "Cannot GET /" error
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running successfully!",
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Your existing routes
app.use("/api/blogs", blogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/banner", bannerRouter);
app.use("/api/countdowns", countdownRouter);
app.use("/api/cart", cartRouter);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRouter);
app.use("/api/sellers", sellerRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/coupons", couponRouter);

// Error Handler
app.use(errorHandler);

module.exports = app;
