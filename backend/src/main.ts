// backend/src/main.ts

import { serve } from "@hono/node-server";
import app from "./api";
import { startBot } from "./bot";
import { initializeDatabase, testConnection } from "./services/database";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

async function main() {
  try {
    console.log("🚀 Starting PostPilot Bot...");
    console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    
    // Проверяем наличие DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL is not set in environment variables!");
      console.log("💡 Please set DATABASE_URL in Railway environment variables");
      process.exit(1);
    }
    
    console.log(`📊 Database URL: ${process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@')}`);
    
    // Проверяем подключение к базе данных
    console.log("🔌 Testing database connection...");
    const connected = await testConnection();
    if (!connected) {
      console.error("❌ Cannot connect to database. Please check your DATABASE_URL");
      console.log("💡 Make sure PostgreSQL service is running in Railway");
      process.exit(1);
    }
    
    // Инициализируем базу данных
    console.log("📊 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    // Запускаем бота
    console.log("🤖 Starting bot...");
    await startBot();
    console.log("✅ Bot started");
    
    // Запускаем API сервер
    console.log(`🌐 Starting API server on port ${PORT}...`);
    serve({
      fetch: app.fetch,
      port: PORT,
    });
    
    console.log(`✅ API Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log("🎉 PostPilot Bot is ready!");
    
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    console.log("💡 Check your environment variables and database configuration");
    process.exit(1);
  }
}

// Обработка сигналов завершения
process.on("SIGINT", () => {
  console.log("🛑 Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down...");
  process.exit(0);
});

main();
