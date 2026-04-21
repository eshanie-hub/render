const mongoose = require("mongoose");

const temperatureSchema = new mongoose.Schema(
  {
    box_id: { type: String, required: true },
    route_id: { type: String, default: null },
    temp: { type: Number, default: null },
    temp_status: { type: String, required: true },
    temp_min: { type: Number, default: null },
    temp_max: { type: Number, default: null },
    fan: { type: String, default: "OFF" },
    timestamp: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "temperature_logs",
  }
);

module.exports = mongoose.model("TemperatureLog", temperatureSchema);