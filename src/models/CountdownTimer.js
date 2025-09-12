const mongoose = require("mongoose");

const countdownTimerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CountdownTimer =
  mongoose.models.CountdownTimer ||
  mongoose.model("CountdownTimer", countdownTimerSchema);

module.exports = CountdownTimer;
