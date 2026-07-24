import { serve } from "@hono/node-server";
import app from "./api";
import dotenv from "dotenv";
import fs from "fs";

// Загружаем переменные окружения
dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

console.log("🚀 Starting PostPilot Bot API...");
console.log(`📡 Port: ${PORT}`);
console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);

// Проверяем наличие токена
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
  console.log("💡 Please set TELEGRAM_BOT_TOKEN in Railway environment variables");
  console.log("💡 Or run: export TELEGRAM_BOT_TOKEN=your_token_here");
  // Не выходим, чтобы можно было проверить health
} else {
  console.log(`✅ TELEGRAM_BOT_TOKEN: ${BOT_TOKEN.substring(0, 10)}... (length: ${BOT_TOKEN.length})`);
}

// Проверяем WEBHOOK_URL
const WEBHOOK_URL = process.env.WEBHOOK_URL;
if (!WEBHOOK_URL) {
  console.warn("⚠️ WEBHOOK_URL is not set");
} else {
  console.log(`✅ WEBHOOK_URL: ${WEBHOOK_URL}`);
}

// Запускаем сервер
try {
  console.log("📡 Starting HTTP server...");
  
  const server = serve({
    fetch: app.fetch,
    port: PORT,
  });
  
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log("🎉 PostPilot Bot API is ready!");
  
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}
