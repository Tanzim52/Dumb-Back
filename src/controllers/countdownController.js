const CountdownTimer = require("../models/CountdownTimer");

exports.createTimer = async (req, res, next) => {
  try {
    const timer = await CountdownTimer.create(req.body);
    res.status(201).json({ success: true, data: timer });
  } catch (err) {
    next(err);
  }
};

exports.getTimers = async (req, res, next) => {
  try {
    const timers = await CountdownTimer.find().sort({ createdAt: -1 });
    res.json({ success: true, data: timers });
  } catch (err) {
    next(err);
  }
};

exports.getTimerById = async (req, res, next) => {
  try {
    const timer = await CountdownTimer.findById(req.params.id);
    if (!timer)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: timer });
  } catch (err) {
    next(err);
  }
};

exports.updateTimer = async (req, res, next) => {
  try {
    const timer = await CountdownTimer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!timer)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: timer });
  } catch (err) {
    next(err);
  }
};

exports.deleteTimer = async (req, res, next) => {
  try {
    const timer = await CountdownTimer.findByIdAndDelete(req.params.id);
    if (!timer)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
};
