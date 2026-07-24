// backend/src/main.ts
import { serve } from "@hono/node-server";
import app from "./api";
import dotenv from "dotenv";
import { startBot } from "./bot";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

console.log("🚀 Starting PostPilot Bot API...");
console.log(`📡 Port: ${PORT}`);

// Запускаем бота
startBot().catch(console.error);

try {
  serve({
    fetch: app.fetch,
    port: PORT,
  });
  
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`🌐 Health: https://postpilot-bot-production.up.railway.app/health`);
  console.log(`📡 Webhook: https://postpilot-bot-production.up.railway.app/webhook`);
  console.log("🎉 PostPilot Bot is ready!");
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}
