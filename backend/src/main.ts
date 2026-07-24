// backend/src/main.ts
import { serve } from "@hono/node-server";
import app from "./api";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000");

console.log("🚀 Starting PostPilot Bot API...");
console.log(`📡 Port: ${PORT}`);

try {
  const server = serve({
    fetch: app.fetch,
    port: PORT,
  });
  
  console.log(`✅ API Server running on port ${PORT}`);
  console.log(`🌐 Health: https://postpilot-bot-production.up.railway.app/health`);
  console.log(`📡 Webhook: https://postpilot-bot-production.up.railway.app/webhook`);
  
  // Обработка ошибок сервера
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use!`);
      console.log(`💡 Try using a different port or kill the existing process`);
      process.exit(1);
    }
  });
  
} catch (error) {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}
