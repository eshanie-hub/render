const { GoogleGenerativeAI } = require("@google/generative-ai");
const AccessLog = require('../mongodb/security');
const MotionLog = require('../mongodb/motion');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Load and Parse the JSON Data Dictionary
let dataDictionary = {};
try {
    const rawData = fs.readFileSync(path.join(__dirname, '../resources/data_dictionary.json'), 'utf-8');
    dataDictionary = JSON.parse(rawData);
} catch (e) {
    console.error("Error loading data dictionary JSON:", e.message);
}

const functions = {
    getSecurityLogs: async ({ status, card_id, limit = 200 }) => {
        const query = {};
        if (status) query.status = status;
        if (card_id) query.card_id = card_id;
        return await AccessLog.find(query).sort({ receivedAt: -1 }).limit(limit);
    },
    getMotionLogs: async ({ alert, status, limit = 5 }) => {
        const query = {};
        if (alert !== undefined) query.alert = alert;
        if (status) query.status = status;
        return await MotionLog.find(query).sort({ time: -1 }).limit(limit);
    }
};

exports.handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are the MediPORT Assistant. Use the following project specifications to answer user queries accurately.
            
            PROJECT CONTEXT:
            ${JSON.stringify(dataDictionary, null, 2)}
            
            RULES:
            - If a user asks about "vibration risk," refer to the percentage thresholds in the dictionary.
            - If "Critical vibration" is found in the logs, emphasize immediate inspection.
            - Use the tool calls to fetch real-time data from MongoDB before answering database-related questions.`
        });

        // Initialize chat with function tool definitions
        const chat = model.startChat({
            tools: [{
                functionDeclarations: [
                    {
                        name: "getSecurityLogs",
                        description: "Fetch RFID access logs. Use this for questions about box openings or unauthorized access.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                status: { type: "string", enum: ["Unlocked", "Locked", "Denied"] },
                                card_id: { type: "string" },
                                limit: { type: "number" }
                            }
                        }
                    },
                    {
                        name: "getMotionLogs",
                        description: "Fetch vibration and stability data. Use for questions about transport safety and rough handling.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                alert: { type: "boolean" },
                                status: { type: "string", enum: ["Stable", "Moderate vibration", "High vibration", "Critical vibration"] },
                                limit: { type: "number" }
                            }
                        }
                    }
                ]
            }]
        });

        const result = await chat.sendMessage(message);
        const response = result.response;
        const call = response.functionCalls()?.[0];

        if (call) {
            // Execute the MongoDB query
            const toolData = await functions[call.name](call.args);

            // Send tool result back to Gemini for final interpretation
            const finalResult = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: { content: toolData }
                }
            }]);

            return res.json({ reply: finalResult.response.text() });
        }

        res.json({ reply: response.text() });
    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Failed to process chat request" });
    }
};