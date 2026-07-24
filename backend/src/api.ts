// backend/src/api.ts - УПРОЩЕННАЯ ВЕРСИЯ ДЛЯ ТЕСТА
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type"],
}));

// ROOT - проверка что сервер работает
app.get("/", (c) => {
  return c.json({
    name: "PostPilot Bot API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// HEALTH - проверка здоровья
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// WEBHOOK - принимаем запросы от Telegram
app.post("/webhook", async (c) => {
  try {
    const body = await c.req.json();
    console.log("📨 Webhook received:", JSON.stringify(body).substring(0, 200) + "...");
    
    // Пока просто отвечаем что получили
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
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
