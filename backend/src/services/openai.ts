// backend/src/services/openai.ts

import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePost(
  text: string,
  style: string = "auto",
  tone?: string
): Promise<string> {
  try {
    const styleMap: Record<string, string> = {
      viral: "сделай вирусным, добавь эмоций, используй популярные фразы",
      professional: "сделай профессиональным, используй деловой тон",
      funny: "сделай смешным, добавь юмор и иронию",
      educational: "сделай образовательным, добавь полезную информацию",
      sales: "сделай продающим, добавь призывы к действию",
      auto: "сделай универсальным, найди подходящий стиль",
    };

    const styleDescription = styleMap[style] || styleMap.auto;
    const toneInstruction = tone ? `Тон: ${tone}` : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Ты профессиональный копирайтер, который создает качественные посты для соцсетей. 
          Твоя задача: на основе текста пользователя создать пост. ${styleDescription}. ${toneInstruction}
          Пост должен быть структурированным, интересным и готовым к публикации. Используй эмодзи для украшения.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "Не удалось сгенерировать пост.";
  } catch (error) {
    console.error("OpenAI generation error:", error);
    throw new Error("Failed to generate post");
  }
}

export async function transcribeVoice(filePath: string): Promise<string> {
  try {
    const file = require("fs").createReadStream(filePath);
    
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ru",
    });

    return response.text;
  } catch (error) {
    console.error("Whisper transcription error:", error);
    throw new Error("Failed to transcribe voice");
  }
}

export default {
  generatePost,
  transcribeVoice,
};
