const express = require('express');
const router  = express.Router();
const MotionLog = require('../mongodb/motion');

// GET /api/motion/latest
router.get('/latest', async (req, res) => {
    try {
        // Sort by createdAt (real Date) not time (String)
        const latestLog = await MotionLog.findOne().sort({ createdAt: -1 });
        if (!latestLog) {
            return res.status(404).json({ message: "No sensor data found" });
        }
        res.json(latestLog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/motion  
router.get('/', async (req, res) => {
    try {
        const { date, status } = req.query;
        const query = {};

        // Filter by date 
        if (date) {
            // time field stored as "YYYY-MM-DD HH:MM:SS"
            query.time = { $regex: `^${date}` };
        }

        // Filter by rule-based status
        if (status) {
            query.status = status;
        }

        const logs = await MotionLog
            .find(query)
            .sort({ createdAt: -1 })   
            .limit(200);               

        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;