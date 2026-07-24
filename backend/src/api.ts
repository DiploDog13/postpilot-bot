// backend/src/api.ts
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

// WEBHOOK
app.post("/webhook", async (c) => {
  try {
    console.log("📨 Webhook received!");
    
    const body = await c.req.json();
    console.log(`📨 Update ID: ${body.update_id || 'unknown'}`);
    
    // Telegram expects 200 OK response
    return c.json({ 
      status: "ok", 
      message: "Webhook received",
      update_id: body.update_id 
    });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    // Важно: Telegram требует ответ 200, даже при ошибке
    return c.json({ error: "Webhook failed" }, 200);
  }
});

// Обработка ошибок
app.onError((err, c) => {
  console.error("❌ Server error:", err);
  return c.json({ error: "Internal server error" }, 200);
});

// 404
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

export default app;
