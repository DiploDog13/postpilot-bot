// backend/src/api.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Health
app.get("/health", (c) => {
  console.log("🏥 Health check");
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root
app.get("/", (c) => {
  return c.json({ 
    status: "running",
    name: "PostPilot Bot API",
    endpoints: ["/health", "/webhook"]
  });
});

// Webhook
app.post("/webhook", async (c) => {
  console.log("📨 Webhook received!");
  
  try {
    const body = await c.req.json();
    console.log(`📨 Update ID: ${body.update_id || 'unknown'}`);
    
    // Всегда возвращаем 200 для Telegram
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

// Error handler
app.onError((err, c) => {
  console.error("❌ Server error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
