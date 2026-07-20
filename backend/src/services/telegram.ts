import { Bot, GrammyError, HttpError } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

export function createBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  
  return new Bot(token);
}

export async function sendInvoice(
  bot: Bot,
  chatId: number,
  title: string,
  description: string,
  payload: string,
  prices: Array<{ label: string; amount: number }>
): Promise<void> {
  await bot.api.sendInvoice(chatId, {
    title,
    description,
    payload,
    currency: 'XTR',
    prices,
    provider_token: '',
  });
}

export async function answerPreCheckoutQuery(
  bot: Bot,
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  await bot.api.answerPreCheckoutQuery(preCheckoutQueryId, ok, errorMessage);
}

export async function editMessageText(
  bot: Bot,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: any
): Promise<void> {
  await bot.api.editMessageText(chatId, messageId, text, {
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

export async function sendMessage(
  bot: Bot,
  chatId: number,
  text: string,
  replyMarkup?: any
): Promise<void> {
  await bot.api.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

export function createStyleKeyboard(draftId: number): any {
  return {
    inline_keyboard: [
      [
        { text: '📋 Copy', callback_data: `copy_${draftId}` },
        { text: '💾 Save', callback_data: `save_${draftId}` },
      ],
      [
        { text: '🔄 Regenerate', callback_data: `regenerate_${draftId}` },
        { text: '📤 Share', callback_data: `share_${draftId}` },
      ],
    ],
  };
}

export function createUpgradeKeyboard(): any {
  return {
    inline_keyboard: [
      [
        {
          text: '⭐ Upgrade to Pro - 500 Stars',
          pay: true,
        },
      ],
    ],
  };
}

export function createWelcomeKeyboard(): any {
  const miniAppUrl = process.env.MINI_APP_URL || 'https://example.com';
  return {
    inline_keyboard: [
      [
        {
          text: '🚀 Open Dashboard',
          web_app: { url: miniAppUrl },
        },
      ],
    ],
  };
}
