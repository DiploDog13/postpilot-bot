// backend/src/setup-webhook.ts
import dotenv from "dotenv";
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

async function setupWebhook() {
  if (!BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set");
    process.exit(1);
  }

  if (!WEBHOOK_URL) {
    console.error("❌ WEBHOOK_URL is not set");
    console.log("💡 Set WEBHOOK_URL in Railway environment variables");
    process.exit(1);
  }

  const webhookUrl = `${WEBHOOK_URL}/webhook`;
  
  try {
    // Устанавливаем webhook
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true,
        }),
      }
    );

    const result = await response.json();
    
    if (result.ok) {
      console.log(`✅ Webhook set successfully to: ${webhookUrl}`);
      console.log(`📡 Webhook info:`, result);
    } else {
      console.error(`❌ Failed to set webhook:`, result);
    }
  } catch (error) {
    console.error("❌ Error setting webhook:", error);
  }
}

setupWebhook();
