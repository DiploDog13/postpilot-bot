// backend/src/main.ts

import { serve } from "@hono/node-server";
import app from "./api";
import { startBot } from "./bot";
import { initializeDatabase } from "./services/database";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

async function main() {
  try {
    console.log("🚀 Starting PostPilot Bot...");
    
    // Инициализируем базу данных
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    // Запускаем бота
    await startBot();
    console.log("✅ Bot started");
    
    // Запускаем API сервер
    serve({
      fetch: app.fetch,
      port: PORT,
    });
    
    console.log(`✅ API Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📡 Webhook URL: ${process.env.WEBHOOK_URL || "Not set"}`);
    
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    process.exit(1);
  }
}

main();
