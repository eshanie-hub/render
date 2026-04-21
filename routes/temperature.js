const express = require("express");
const router = express.Router();
const TemperatureLog = require("../mongodb/temperature");

// Get all temperature logs
router.get("/", async (req, res) => {
  try {
    const { route_id } = req.query;

    const filter = {};
    if (route_id) {
      filter.route_id = route_id;
    }

    const logs = await TemperatureLog.find(filter).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch temperature logs",
      error: error.message,
    });
  }
});

// Get latest temperature log
router.get("/latest", async (req, res) => {
  try {
    const { route_id } = req.query;

    const filter = {};
    if (route_id) {
      filter.route_id = route_id;
    }

    const latestLog = await TemperatureLog.findOne(filter).sort({ createdAt: -1 });
    res.json(latestLog);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch latest temperature log",
      error: error.message,
    });
  }
});

module.exports = router;