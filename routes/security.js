const express = require('express');
const router = express.Router();
const AccessLog = require('../mongodb/security');

// Get all logs
router.get('/', async (req, res) => {
    try {
        const logs = await AccessLog.find().sort({ receivedAt: -1 }).limit(50);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;