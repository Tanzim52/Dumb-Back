const dotenv = require("dotenv");
const path = require("path");

// Load .env from root (../../ because mailer.js is inside src/config)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// console.log("SMTP_USER:", process.env.SMTP_USER);
// console.log("SMTP_PASS:", process.env.SMTP_PASS ? "✅ Loaded" : "❌ Missing");

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = transporter;
