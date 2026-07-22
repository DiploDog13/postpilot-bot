// backend/src/main.ts
import { serve } from "@hono/node-server";
import app from "./api";
import { startBot } from "./bot";
import { initializeDatabase, testConnection } from "./services/database";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function setupWebhook() {
  if (!BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set");
    return;
  }

  if (!WEBHOOK_URL) {
    console.log("ℹ️ WEBHOOK_URL not set, using polling mode");
    return;
  }

  const webhookUrl = `${WEBHOOK_URL}/webhook`;
  
  try {
    console.log(`📡 Setting webhook to: ${webhookUrl}`);
    
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true,
          max_connections: 100,
        }),
      }
    );

    const result = await response.json();
    
    if (result.ok) {
      console.log(`✅ Webhook set successfully to: ${webhookUrl}`);
      
      // Получаем информацию о webhook
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
      );
      const info = await infoResponse.json();
      console.log(`📊 Webhook info:`, info.result);
    } else {
      console.error(`❌ Failed to set webhook:`, result.description);
    }
  } catch (error) {
    console.error("❌ Error setting webhook:", error);
  }
}

async function main() {
  try {
    console.log("🚀 Starting PostPilot Bot...");
    console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    
    // Проверяем переменные
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
      process.exit(1);
    }
    
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL is not set!");
      process.exit(1);
    }
    
    // Подключаемся к базе данных
    console.log("🔌 Testing database connection...");
    const connected = await testConnection();
    if (!connected) {
      console.error("❌ Cannot connect to database");
      process.exit(1);
    }
    
    // Инициализируем базу данных
    console.log("📊 Initializing database...");
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    // Настраиваем webhook
    await setupWebhook();
    
    // Запускаем бота (если webhook не настроен, использует polling)
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
    console.log(`📡 Webhook URL: ${WEBHOOK_URL ? WEBHOOK_URL + '/webhook' : 'Not set (polling mode)'}`);
    console.log("🎉 PostPilot Bot is ready!");
    
  } catch (error) {
    console.error("❌ Failed to start application:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  console.log("🛑 Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down...");
  process.exit(0);
});

main();
