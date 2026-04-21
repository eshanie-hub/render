const express = require("express");
const router = express.Router();
const RouteSession = require("../mongodb/routeSession");

function generateRouteId() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `ROUTE-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

router.get("/current", async (req, res) => {
  try {
    const activeRoute = await RouteSession.findOne({ status: "ACTIVE" }).sort({
      createdAt: -1,
    });

    res.json(activeRoute || null);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch current route", error: error.message });
  }
});

// NEW: get all routes for history dropdown
router.get("/", async (req, res) => {
  try {
    const routes = await RouteSession.find().sort({ createdAt: -1 });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch routes", error: error.message });
  }
});

router.post("/start", async (req, res) => {
  try {
    const existingActiveRoute = await RouteSession.findOne({ status: "ACTIVE" });

    if (existingActiveRoute) {
      return res.status(400).json({
        message: "A route is already active",
        route: existingActiveRoute,
      });
    }

    const newRoute = new RouteSession({
      route_id: generateRouteId(),
      status: "ACTIVE",
      start_time: new Date(),
    });

    await newRoute.save();

    res.status(201).json({
      message: "Route started successfully",
      route: newRoute,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to start route", error: error.message });
  }
});

router.post("/end", async (req, res) => {
  try {
    const activeRoute = await RouteSession.findOne({ status: "ACTIVE" }).sort({
      createdAt: -1,
    });

    if (!activeRoute) {
      return res.status(404).json({ message: "No active route found" });
    }

    activeRoute.status = "ENDED";
    activeRoute.end_time = new Date();

    await activeRoute.save();

    res.json({
      message: "Route ended successfully",
      route: activeRoute,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to end route", error: error.message });
  }
});

module.exports = router;