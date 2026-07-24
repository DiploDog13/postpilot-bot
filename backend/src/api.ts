// backend/src/api.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { webhookHandler } from "./bot";

const app = new Hono();

// CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// Health
app.get("/health", (c) => {
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

// Webhook - используем обработчик из bot.ts
app.post("/webhook", async (c) => {
  try {
    console.log("📨 Webhook received!");
    return await webhookHandler(c);
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return c.json({ ok: false, error: "Webhook failed" }, 200);
  }
});

// 404
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

export default app;
