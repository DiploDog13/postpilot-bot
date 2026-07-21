import { serve } from '@hono/node-server';
import bot from './bot';
import api from './api';
import { initializeDatabase } from './services/database';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  await initializeDatabase();
  console.log('Database initialized');

  const port = parseInt(process.env.PORT || '3000');
  
  serve({
    fetch: api.fetch,
    port,
  });
  
  console.log(`API server running on port ${port}`);

  if (process.env.WEBHOOK_URL) {
    await bot.api.setWebhook(process.env.WEBHOOK_URL);
    console.log(`Webhook set to ${process.env.WEBHOOK_URL}`);
  } else {
    bot.start();
    console.log('Bot started with polling');
  }
}

main().catch(console.error);
