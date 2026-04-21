const mongoose = require('mongoose');

const humiditySchema = new mongoose.Schema(
  {
    box_id: {
      type: String,
      required: true,
    },
    route_id: { type: String, default: null },
    hum: {
      type: Number,
      default: null,
    },
    hum_status: {
      type: String,
      required: true,
    },
    hum_min: {
      type: Number,
      default: null,
    },
    hum_max: {
      type: Number,
      default: null,
    },
    fan: {
      type: String,
      enum: ['ON', 'OFF'],
      default: 'OFF',
    },
    timestamp: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'humidity_logs',
  }
);

module.exports = mongoose.model('HumidityLog', humiditySchema);