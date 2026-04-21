const mongoose = require('mongoose');

// Define the schema (matching your ESP32 JSON structure)
const logSchema = new mongoose.Schema({
    timestamp: String,
    card_id: String,
    status: String,
    anomaly: String,
    receivedAt: { type: Date, default: Date.now } // Extra server-side timestamp
});

module.exports = mongoose.model('AccessLog', logSchema);