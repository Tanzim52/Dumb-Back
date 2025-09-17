const dotenv = require("dotenv");
const connectDB = require("./config/db");
const app = require("./app");

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;

// REMOVE the Vercel export - Render doesn't need it
// module.exports = app;

// ALWAYS listen - Remove the condition
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});