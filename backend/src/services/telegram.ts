import { Bot, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

export function createBot() {
  return new Bot(process.env.TELEGRAM_BOT_TOKEN || '');
}

export async function sendInvoice(
  bot: Bot,
  chatId: number,
  title: string,
  description: string,
  amount: number,
  currency: string = 'XTR'
) {
  await bot.api.sendInvoice(chatId, title, description, 'payload', '', currency, [
    {
      label: 'Pro Subscription',
      amount: amount,
    },
  ]);
}

export async function answerPreCheckoutQuery(bot: Bot, preCheckoutQueryId: string) {
  await bot.api.answerPreCheckoutQuery(preCheckoutQueryId, true);
}

export async function editMessageText(
  bot: Bot,
  chatId: number,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard
) {
  await bot.api.editMessageText(chatId, messageId, text, {
    reply_markup: keyboard,
  });
}

export async function sendMessage(
  bot: Bot,
  chatId: number,
  text: string,
  keyboard?: InlineKeyboard
) {
  await bot.api.sendMessage(chatId, text, {
    reply_markup: keyboard,
    parse_mode: 'HTML',
  });
}

export function createStyleKeyboard(draftId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('💼 Professional', `style_${draftId}_professional`)
    .row()
    .text('🔥 Viral', `style_${draftId}_viral`)
    .text('😄 Funny', `style_${draftId}_funny`)
    .row()
    .text('💰 Sales', `style_${draftId}_sales`)
    .text('📚 Educational', `style_${draftId}_educational`);
}

export function createActionKeyboard(draftId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 Copy', `copy_${draftId}`)
    .text('💾 Save', `save_${draftId}`)
    .row()
    .text('🔄 Regenerate', `regenerate_${draftId}`)
    .text('📤 Share', `share_${draftId}`);
}

export function createBrandVoiceKeyboard(draftId: number, voices: string[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  voices.forEach((voice, index) => {
    if (index % 2 === 0) keyboard.row();
    keyboard.text(voice, `voice_${draftId}_${voice}`);
  });
  keyboard.row().text('✏️ Custom', `custom_${draftId}`);
  return keyboard;
}

export function createUpgradeKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('⭐ Upgrade to Pro (500 Stars)', 'upgrade_pro');
}
