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
    version: "1.0.0"
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
  console.log("📨 Webhook received!");
  
  try {
    const body = await c.req.json();
    console.log(`📨 Update ID: ${body.update_id || 'unknown'}`);
    
    return c.json({ 
      ok: true,
      status: "ok",
      message: "Webhook received",
      update_id: body.update_id
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return c.json({ ok: false, error: "Webhook failed" }, 200);
  }
});

// 404
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

// Обработка ошибок
app.onError((err, c) => {
  console.error("❌ Server error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
