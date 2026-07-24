// backend/src/main.ts
import { serve } from "@hono/node-server";
import app from "./api";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

console.log("🚀 Starting PostPilot Bot API...");
console.log(`📡 Port: ${PORT}`);

try {
  serve({
    fetch: app.fetch,
    port: PORT,
  });
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`🌐 Health: https://postpilot-bot-production.up.railway.app/health`);
  console.log(`📡 Webhook: https://postpilot-bot-production.up.railway.app/webhook`);
} catch (error) {
  console.error("❌ Failed to start:", error);
  process.exit(1);
}
