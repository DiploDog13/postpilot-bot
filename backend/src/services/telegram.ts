// backend/src/services/telegram.ts

import { Context } from "grammy";
import { LabeledPrice } from "grammy/types";
import { tmpdir } from "os";
import { join } from "path";
import * as fs from "fs";

// Скачивание файла из Telegram
export async function downloadFile(ctx: Context, fileId: string): Promise<string> {
  try {
    // Получаем информацию о файле
    const file = await ctx.api.getFile(fileId);
    const filePath = file.file_path;
    
    if (!filePath) {
      throw new Error("File path not found");
    }
    
    // Формируем URL для скачивания
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    
    // Используем fetch для скачивания
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Сохраняем во временную папку
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
    // Скачиваем файл
    const filePath = await downloadFile(ctx, fileId);
    
    // Здесь должна быть интеграция с OpenAI Whisper API
    // Для демонстрации возвращаем тестовый текст
    
    // Удаляем временный файл
    fs.unlinkSync(filePath);
    
    return "🎤 Распознанное голосовое сообщение: Привет! Это пример транскрипции твоего голосового сообщения.";
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
    // Создаем массив цен для Telegram Stars
    // 1 Star = 100 копеек/центов
    const prices: LabeledPrice[] = [
      { 
        label: "⭐️ Pro Subscription", 
        amount: starsAmount * 100 // Конвертируем Stars в копейки/центы
      }
    ];
    
    // Отправляем инвойс с правильным типом prices
    const result = await ctx.api.sendInvoice(
      chatId,
      title,
      description,
      payload,
      "", // provider_token оставляем пустым для Stars
      "XTR", // Валюта для Telegram Stars
      prices // Передаем массив LabeledPrice[]
    );
    
    return result;
  } catch (error) {
    console.error("Send invoice error:", error);
    throw error;
  }
}

// Отправка обычного сообщения с клавиатурой
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

// Экспорт утилит для работы с медиа
export default {
  downloadFile,
  sendVoiceTranscription,
  sendPaymentInvoice,
  sendTelegramMessage,
};
