import { serve } from '@hono/node-server';
import api from './api';
import bot from './bot';
import { initializeDatabase } from './services/database';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');

async function main() {
  // Initialize database
  await initializeDatabase();
  console.log('Database initialized');

  // Start API server
  serve({
    fetch: api.fetch,
    port: PORT,
  });
  console.log(`API server running on port ${PORT}`);

  // Start bot webhook or polling
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  if (WEBHOOK_URL) {
    await bot.api.setWebhook(WEBHOOK_URL);
    console.log(`Bot webhook set to ${WEBHOOK_URL}`);
  } else {
    bot.start();
    console.log('Bot started with polling');
  }
}

main().catch(console.error);
