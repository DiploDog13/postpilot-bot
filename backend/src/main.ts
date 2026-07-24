// backend/src/main.ts
import { serve } from "@hono/node-server";
import app from "./api";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

console.log("🚀 Starting PostPilot Bot API...");
console.log(`📡 Port: ${PORT}`);
console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);

// Проверяем наличие токена
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
  console.log("💡 Please set TELEGRAM_BOT_TOKEN in Railway environment variables");
} else {
  console.log(`✅ TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
}

// Проверяем WEBHOOK_URL
if (!process.env.WEBHOOK_URL) {
  console.warn("⚠️ WEBHOOK_URL is not set");
} else {
  console.log(`✅ WEBHOOK_URL: ${process.env.WEBHOOK_URL}`);
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
  
  // Обработка сигналов завершения
  process.on("SIGINT", () => {
    console.log("🛑 Shutting down...");
    process.exit(0);
  });
  
  process.on("SIGTERM", () => {
    console.log("🛑 Shutting down...");
    process.exit(0);
  });
  
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}
