// backend/src/main.ts
import { serve } from "@hono/node-server";
import app from "./api";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://postpilot-bot-production.up.railway.app";

console.log("🚀 Starting PostPilot Bot API...");
console.log(`📡 Port: ${PORT}`);
console.log(`📡 WEBHOOK_URL: ${WEBHOOK_URL}`);
console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? "✅ Set" : "❌ Not set"}`);

// Запускаем сервер
try {
  serve({
    fetch: app.fetch,
    port: PORT,
  });
  
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`🌐 Health check: ${WEBHOOK_URL}/health`);
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}/webhook`);
  console.log("🎉 PostPilot Bot API is ready!");
  
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}
