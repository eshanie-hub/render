require("dotenv").config();
const mqtt = require("mqtt");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Models & Routes (Keeping your existing imports)
const AccessLog = require("./mongodb/security");
const MotionLog = require("./mongodb/motion");
const TemperatureLog = require("./mongodb/temperature");
const HumidityLog = require("./mongodb/humidity");
const RouteSession = require("./mongodb/routeSession");
const securityRoutes = require("./routes/security");
const authRoutes = require("./routes/authRoutes");
const motionRoutes = require("./routes/motion");
const temperatureRoutes = require("./routes/temperature");
const humidityRoutes = require("./routes/humidity");
const routeSessionRoutes = require("./routes/routeSession");
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);

// FIX: Flexible CORS to handle Vercel deployment previews
const allowedOrigins = [
    "https://project-8s75c.vercel.app",
    /\.vercel\.app$/  // This allows any vercel.app sub-domain (fixing your console error)
];

const io = new Server(server, {
    cors: { 
        origin: allowedOrigins, 
        methods: ["GET", "POST"],
        credentials: true
    },
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

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

// Merged WebSocket Handler
io.on("connection", (socket) => {
    console.log(`🔌 New Web Client Connected: ${socket.id}`);
    socket.on("uiLockResponse", (response) => {
        if (response === "yes") {
            client.publish("sensor/command", "lock");
        }
    });
    socket.on("disconnect", () => console.log("🔌 Client Disconnected"));
});

client.on("connect", () => {
    console.log("📡 Connected to HiveMQ Cloud");
    client.subscribe(["sensor/security", "sensor/motion", "sensor/temperature", "sensor/humidity", "sensor/lock_request"]);
});

client.on("message", async (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        if (topic === "sensor/lock_request") {
            data.alert === "clear" ? io.emit("clearLockUI") : io.emit("requestLockUI", { message: "Lid is closed. Lock now?" });
        } else if (topic === "sensor/security") {
            await new AccessLog(data).save();
            io.emit("lockUpdate", data);
        } else if (topic === "sensor/motion") {
            const lastLog = await MotionLog.findOne().sort({ createdAt: -1 });
            const rollingRisk = Math.round((0.3 * data.risk_score) + (0.7 * (lastLog ? lastLog.rolling_risk : data.risk_score)));
            const newMotionLog = new MotionLog({ ...data, rolling_risk: rollingRisk });
            await newMotionLog.save();
            io.emit("motionUpdate", { ...newMotionLog.toObject(), rolling_risk: rollingRisk });
        } else if (topic === "sensor/temperature" || topic === "sensor/humidity") {
            const activeRoute = await RouteSession.findOne({ status: "ACTIVE" }).sort({ createdAt: -1 });
            const Model = topic === "sensor/temperature" ? TemperatureLog : HumidityLog;
            const newLog = new Model({ ...data, route_id: activeRoute ? activeRoute.route_id : null });
            await newLog.save();
            io.emit(topic === "sensor/temperature" ? "temperatureUpdate" : "humidityUpdate", newLog);
        }
    } catch (error) {
        console.error("❌ MQTT error:", error.message);
    }
});

const PORT = process.env.PORT || 8080; 
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));