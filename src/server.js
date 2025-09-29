const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;

// For Vercel deployment, we need to export the app
// Remove the app.listen() and export instead

// Export for Vercel
module.exports = app;

// Only listen locally, not in Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on this port  http://localhost:${PORT}`);
  });
}
