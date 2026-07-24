// backend/src/services/openai.ts
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// Проверяем наличие API ключа
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set. OpenAI features will not work.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
});

export async function generatePost(
  text: string,
  style: string = "auto",
  tone?: string
): Promise<string> {
  try {
    // Если нет API ключа, возвращаем заглушку
    if (!process.env.OPENAI_API_KEY) {
      return `📝 Сгенерированный пост (заглушка):\n\n${text}\n\nСтиль: ${style}`;
    }

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
    // Возвращаем заглушку вместо ошибки
    return `📝 Пост (сгенерирован с ошибкой):\n\n${text}\n\nСтиль: ${style}`;
  }
}

export default {
  generatePost,
};
