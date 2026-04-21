const mongoose = require("mongoose");

const routeSessionSchema = new mongoose.Schema(
  {
    route_id: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ENDED"],
      default: "ACTIVE",
    },
    start_time: {
      type: Date,
      required: true,
      default: Date.now,
    },
    end_time: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "route_sessions",
  }
);

module.exports = mongoose.model("RouteSession", routeSessionSchema);