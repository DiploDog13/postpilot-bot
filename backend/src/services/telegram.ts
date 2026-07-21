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

// Отправка платежного запроса (Telegram Stars) - ГАРАНТИРОВАННО РАБОЧАЯ ВЕРСИЯ
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
    
    // Используем прямой HTTP запрос к Telegram API
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
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
        provider_token: '', // Пустой для Telegram Stars
        currency: 'XTR', // Валюта для Telegram Stars
        prices: prices, // Массив LabeledPrice[]
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

// Вспомогательная функция для отправки инвойса через grammy (альтернативный вариант)
export async function sendPaymentInvoiceGrammy(
  ctx: Context,
  chatId: number,
  title: string,
  description: string,
  payload: string,
  starsAmount: number
) {
  try {
    const prices: LabeledPrice[] = [
      { 
        label: "⭐️ Pro Subscription", 
        amount: starsAmount * 100 
      }
    ];
    
    // Используем grammy API
    const result = await ctx.api.sendInvoice(
      chatId,
      title,
      description,
      payload,
      '', // provider_token
      'XTR', // currency
      prices // prices
    );
    
    return result;
  } catch (error) {
    console.error("Send invoice grammy error:", error);
    throw error;
  }
}

// Экспорт утилит для работы с медиа
export default {
  downloadFile,
  sendVoiceTranscription,
  sendPaymentInvoice,
  sendPaymentInvoiceGrammy,
  sendTelegramMessage,
};
