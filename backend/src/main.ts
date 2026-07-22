// backend/src/main.ts
import { serve } from "@hono/node-server";
import app from "./api";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

console.log("🚀 Starting PostPilot Bot API...");
console.log(`📡 Port: ${PORT}`);
console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);

// Проверяем наличие токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
  console.log("💡 Please set TELEGRAM_BOT_TOKEN in Railway environment variables");
  process.exit(1);
}

console.log("✅ TELEGRAM_BOT_TOKEN is set");

// Запускаем сервер
try {
  serve({
    fetch: app.fetch,
    port: PORT,
  });
  
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`🌐 Health check: https://${process.env.RAILWAY_STATIC_URL || 'localhost'}/health`);
  console.log(`📡 Webhook URL: https://${process.env.RAILWAY_STATIC_URL || 'localhost'}/webhook`);
  console.log("🎉 PostPilot Bot API is ready!");
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}
