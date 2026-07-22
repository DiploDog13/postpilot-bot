// backend/src/services/telegram.ts

import { Context } from "grammy";
import { tmpdir } from "os";
import { join } from "path";
import * as fs from "fs";

// Скачивание файла из Telegram
export async function downloadFile(ctx: Context, fileId: string): Promise<string> {
  try {
    const file = await ctx.api.getFile(fileId);
    const filePath = file.file_path;
    
    if (!filePath) {
      throw new Error("File path not found");
    }
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const tempFile = join(tmpdir(), `voice_${Date.now()}.ogg`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempFile, Buffer.from(buffer));
    
    return tempFile;
  } catch (error) {
    console.error("Download file error:", error);
    throw error;
  }
}

// Транскрипция голосового сообщения
export async function sendVoiceTranscription(ctx: Context, fileId: string): Promise<string> {
  try {
    const filePath = await downloadFile(ctx, fileId);
    fs.unlinkSync(filePath);
    
    return "🎤 Распознанное голосовое сообщение: Привет! Это пример транскрипции.";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

// Отправка платежного запроса (Telegram Stars)
export async function sendPaymentInvoice(
  ctx: Context,
  chatId: number,
  title: string,
  description: string,
  payload: string,
  starsAmount: number
) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    
    // Создаем массив цен
    const prices = [
      { 
        label: "⭐️ Pro Subscription", 
        amount: starsAmount * 100 
      }
    ];
    
    const url = `https://api.telegram.org/bot${botToken}/sendInvoice`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        title: title,
        description: description,
        payload: payload,
        provider_token: '',
        currency: 'XTR',
        prices: prices,
        start_parameter: 'pro_subscription',
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(result)}`);
    }
    
    return result;
  } catch (error) {
    console.error("Send invoice error:", error);
    throw error;
  }
}

// Отправка сообщения
export async function sendTelegramMessage(
  ctx: Context,
  chatId: number,
  text: string,
  options?: any
) {
  try {
    await ctx.api.sendMessage(chatId, text, options);
  } catch (error) {
    console.error("Send message error:", error);
    throw error;
  }
}

export default {
  downloadFile,
  sendVoiceTranscription,
  sendPaymentInvoice,
  sendTelegramMessage,
};
