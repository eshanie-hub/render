require("dotenv").config();
const mqtt = require("mqtt");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Models
const AccessLog = require("./mongodb/security");
const MotionLog = require("./mongodb/motion");
const TemperatureLog = require("./mongodb/temperature");
const HumidityLog = require("./mongodb/humidity");
const RouteSession = require("./mongodb/routeSession");

// Routes
const securityRoutes = require("./routes/security");
const authRoutes = require("./routes/authRoutes");
const motionRoutes = require("./routes/motion");
const temperatureRoutes = require("./routes/temperature");
const humidityRoutes = require("./routes/humidity");
const routeSessionRoutes = require("./routes/routeSession");
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors({
    origin: "https://project-8s75c.vercel.app", // Your Vercel URL
    credentials: true
}));

const io = new Server(server, {
    cors: { 
        origin: "https://project-8s75c.vercel.app", 
        methods: ["GET", "POST"] 
    },
});
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// API Routes
app.use("/api/security", securityRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/motion", motionRoutes);
app.use("/api/temperature", temperatureRoutes);
app.use("/api/humidity", humidityRoutes);
app.use("/api/route", routeSessionRoutes);
app.use('/api/chat', chatRoutes);

// HiveMQ MQTT Connection 
const client = mqtt.connect(process.env.MQTT_URL, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
});

let sessionTotalEnergy = 0;

// WebSocket Connection Handler
io.on("connection", (socket) => {
  console.log(`New Web Client Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log("Client Disconnected");
  });
});

client.on("connect", () => {
    console.log("📡 Connected to HiveMQ Cloud");
    client.subscribe("sensor/security");
    client.subscribe("sensor/motion");
    client.subscribe("sensor/temperature");
    client.subscribe("sensor/humidity");
    client.subscribe("sensor/lock_request");
});

// WebSocket Handler
io.on("connection", (socket) => {
    console.log(`🔌 New Web Client: ${socket.id}`);

    // Receive "YES" from React Frontend and send to ESP32
    socket.on("uiLockResponse", (response) => {
        if (response === "yes") {
            console.log("➡️ UI Command: Sending LOCK to ESP32");
            client.publish("sensor/command", "lock");
        }
    });

    socket.on("disconnect", () => console.log("🔌 Client Disconnected"));
});

client.on("message", async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        // 1. HANDLE LOCK REQUEST ALERT FROM ESP32
        if (topic === "sensor/lock_request") {
          const data = JSON.parse(message.toString());
          
          if (data.alert === "clear") {
              io.emit("clearLockUI"); // New event to hide the popup
          } else {
              io.emit("requestLockUI", { message: "Lid is closed. Lock now?" });
          }
        }

        // 2. SECURITY / RFID LOGS
        else if (topic === "sensor/security") {
            const newLog = new AccessLog(data);
            await newLog.save();
            io.emit("lockUpdate", data);
        }

        // 3. MOTION
                
        else if (topic === "sensor/motion") {
            console.log("🏃 Motion Received from ESP32:", data);

            // Get most recent saved record for exponential moving average
            const lastLog = await MotionLog.findOne().sort({ createdAt: -1 });

            // Exponential moving average
            // Alpha 0.3 = new reading 30%, history 70%
            const alpha = 0.3;
            const lastRolling = lastLog ? lastLog.rolling_risk : data.risk_score;
            const rollingRisk = Math.round((alpha * data.risk_score) + ((1 - alpha) * lastRolling));

            const newMotionLog = new MotionLog({
                ...data,
                rolling_risk: rollingRisk
            });

            await newMotionLog.save();

            io.emit("motionUpdate", {
                ...newMotionLog.toObject(),
                rolling_risk: rollingRisk
            });

            console.log(`Motion saved | Current: ${data.risk_score}% | Rolling: ${rollingRisk}%`);
        }

        // 4. TEMPERATURE & HUMIDITY (with Route ID)
        else if (topic === "sensor/temperature" || topic === "sensor/humidity") {
            const activeRoute = await RouteSession.findOne({ status: "ACTIVE" }).sort({ createdAt: -1 });
            const Model = topic === "sensor/temperature" ? TemperatureLog : HumidityLog;
            const eventName = topic === "sensor/temperature" ? "temperatureUpdate" : "humidityUpdate";

            const newLog = new Model({
                ...data,
                route_id: activeRoute ? activeRoute.route_id : null,
            });
            await newLog.save();
            io.emit(eventName, newLog);
        }

    } catch (error) {
        console.error("❌ MQTT processing error:", error.message);
    }
});

const PORT = process.env.PORT || 8080; // Match Railway's expected port
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));