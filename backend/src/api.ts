// backend/src/api.ts - ПОЛНАЯ ВЕРСИЯ С WEBHOOK
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type"],
}));

// ROOT
app.get("/", (c) => {
  return c.json({
    name: "PostPilot Bot API",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      webhook: "/webhook (POST)",
    }
  });
});

// HEALTH
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// WEBHOOK - ОСНОВНОЙ ЭНДПОИНТ
app.post("/webhook", async (c) => {
  try {
    console.log("📨 Webhook received!");
    
    // Получаем тело запроса
    const body = await c.req.json();
    console.log(`📨 Update ID: ${body.update_id || 'unknown'}`);
    
    // Проверяем, что это сообщение от Telegram
    if (body.message) {
      console.log(`📨 Message from: ${body.message.from?.username || 'unknown'}`);
      console.log(`📨 Text: ${body.message.text || 'no text'}`);
    }
    
    // Возвращаем успешный ответ
    return c.json({ 
      status: "ok", 
      message: "Webhook received",
      update_id: body.update_id 
    });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return c.json({ error: "Webhook failed" }, 500);
  }
});

// Обработка ошибок
app.onError((err, c) => {
  console.error("❌ Server error:", err);
  return c.json({ error: "Internal server error", message: err.message }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

export default app;
