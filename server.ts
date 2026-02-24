import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database("chat.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT,
    role TEXT,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const SYSTEM_INSTRUCTION = `
You are "AVI", the professional Aviation Support Assistant for "SkyLink Airways".
Your goal is to provide precise, professional, and efficient assistance to passengers and clients.

RULES:
1. GREETING: Greet the passenger professionally (e.g., "Welcome to SkyLink Airways. I am AVI, your flight assistant.").
2. NAME: Address the passenger by name if provided. If not, you may proceed but maintain a high level of decorum.
3. INTENTS & REAL INFORMATION:
   - Flight Status: Passengers can check real-time status using their Flight Number on our official website or mobile app.
   - Baggage Policy: 
     * Economy: 1 piece (23kg/50lbs).
     * Business/First: 2 pieces (32kg/70lbs each).
     * Carry-on: 1 small bag + 1 personal item (max 7kg).
   - Check-in: Online check-in opens 24 hours before departure and closes 60 minutes before for domestic, 90 minutes for international.
   - Booking & Reservations: For new bookings or modifications, visit the "Manage Booking" portal or contact our ticketing office.
   - Lost & Found: Report missing baggage at the "Baggage Service Counter" in the arrivals hall or file a claim online within 24 hours.
   - Special Assistance: Requests for wheelchairs or medical assistance must be made at least 48 hours prior to departure.
   - Refund Policy: Refund eligibility depends on the fare type. Non-refundable fares may only receive tax refunds.
4. BEHAVIOR:
   - Tone: 100% professional, calm, and authoritative.
   - Accuracy: Provide factual information based on standard airline protocols.
5. FALLBACK / ESCALATION:
   - For complex re-routing, emergency assistance, or specific legal inquiries, state: "I will now escalate your request to a senior flight operations executive for immediate assistance."

CONVERSATION FLOW:
1. Professional greeting.
2. Identify passenger needs.
3. Provide concise, factual information.
4. Confirm if further assistance is required.
`;

// Knowledge Base for "Offline" / Fallback mode
const KNOWLEDGE_BASE: Record<string, string> = {
  "flight status": "You can check real-time flight status by entering your flight number on the SkyLink mobile app or our official website's 'Flight Tracker' section.",
  "baggage": "SkyLink Airways allows 1 piece of 23kg for Economy and 2 pieces of 32kg for Business Class. Carry-on limit is 7kg.",
  "check-in": "Online check-in opens 24 hours prior to departure. Please ensure you have your booking reference and passport ready.",
  "refund": "Refunds are processed based on your fare conditions. Please visit 'Manage Booking' to check your eligibility.",
  "lost luggage": "Please report lost items at the Baggage Service Counter in the arrivals hall immediately upon landing.",
  "wheelchair": "Special assistance requests, including wheelchairs, must be submitted at least 48 hours before your flight departure.",
  "contact": "You can reach SkyLink Global Support at +1-800-SKYLINK or via email at support@skylinkairways.com.",
  "hello": "Welcome to SkyLink Airways. I am AVI, your professional aviation assistant. How may I assist you today?",
  "hi": "Welcome to SkyLink Airways. I am AVI, your professional aviation assistant. How may I assist you today?",
};

function getFallbackResponse(text: string): string {
  const lowercaseText = text.toLowerCase();
  for (const [key, value] of Object.entries(KNOWLEDGE_BASE)) {
    if (lowercaseText.includes(key)) return value;
  }
  return "I am currently processing requests using our standard information protocol. For specific details regarding your booking or complex travel arrangements, please consult our ground staff or visit the SkyLink mobile app.";
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Gemini Setup
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (sessionId) => {
      socket.join(sessionId);
      const history = db.prepare("SELECT role, text FROM messages WHERE sessionId = ? ORDER BY timestamp ASC").all(sessionId);
      socket.emit("history", history);
    });

    socket.on("message", async ({ sessionId, text }) => {
      db.prepare("INSERT INTO messages (sessionId, role, text) VALUES (?, ?, ?)").run(sessionId, "user", text);

      if (!genAI) {
        // Offline Mode
        const response = getFallbackResponse(text);
        db.prepare("INSERT INTO messages (sessionId, role, text) VALUES (?, ?, ?)").run(sessionId, "model", response);
        socket.emit("chunk", { sessionId, text: response });
        socket.emit("done", { sessionId });
        return;
      }

      const historyRows = db.prepare("SELECT role, text FROM messages WHERE sessionId = ? ORDER BY timestamp ASC").all(sessionId) as { role: string, text: string }[];
      const contents = historyRows.map(row => ({
        role: row.role === "user" ? "user" : "model",
        parts: [{ text: row.text }]
      }));

      try {
        const model = "gemini-2.0-flash";
        const result = await genAI.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.3,
          },
        });

        let fullResponse = "";
        for await (const chunk of result) {
          const chunkText = chunk.text;
          fullResponse += chunkText;
          socket.emit("chunk", { sessionId, text: chunkText });
        }

        db.prepare("INSERT INTO messages (sessionId, role, text) VALUES (?, ?, ?)").run(sessionId, "model", fullResponse);
        socket.emit("done", { sessionId });

      } catch (error) {
        console.error("Gemini Error:", error);
        // Fallback to Knowledge Base on API Error
        const fallback = getFallbackResponse(text);
        socket.emit("chunk", { sessionId, text: fallback });
        db.prepare("INSERT INTO messages (sessionId, role, text) VALUES (?, ?, ?)").run(sessionId, "model", fallback);
        socket.emit("done", { sessionId });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
