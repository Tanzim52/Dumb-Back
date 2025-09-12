const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/countdownController");

// CRUD
router.post("/", ctrl.createTimer);
router.get("/", ctrl.getTimers);
router.get("/:id", ctrl.getTimerById);
router.put("/:id", ctrl.updateTimer);
router.delete("/:id", ctrl.deleteTimer);

module.exports = router;
