// backend/src/bot.ts
import { Bot, Context, SessionFlavor, session, InlineKeyboard } from "grammy";

// Тип для сессии
interface SessionData {
  count: number;
}

type MyContext = Context & SessionFlavor<SessionData>;

// Создаем бота
const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN || "");

// Используем сессию
bot.use(session({
  initial: () => ({ count: 0 }),
}));

// Команда /start
bot.command("start", async (ctx: MyContext) => {
  await ctx.reply(
    "👋 Привет! Я PostPilot Bot!\n\n" +
    "Я помогаю создавать посты для соцсетей.\n\n" +
    "📌 Что я умею:\n" +
    "• Перешли мне любое сообщение\n" +
    "• Отправь голосовое сообщение\n" +
    "• Или просто напиши текст\n\n" +
    "Я превращу это в готовый пост! 🚀"
  );
});

// Команда /help
bot.command("help", async (ctx: MyContext) => {
  await ctx.reply(
    "📖 Помощь по PostPilot Bot:\n\n" +
    "• /start - начать работу\n" +
    "• Перешлите сообщение для генерации поста\n" +
    "• Отправьте голосовое сообщение для транскрипции\n" +
    "• Напишите текст для создания поста\n\n" +
    "💡 Бесплатно: 10 трансформаций в день\n" +
    "⭐️ Pro: безлимитные трансформации за 500 Stars"
  );
});

// Обработка текстовых сообщений
bot.on("message:text", async (ctx: MyContext) => {
  const text = ctx.message.text;
  
  if (text.startsWith("/")) return;
  
  await ctx.reply(
    `📝 Я получил твой текст:\n\n"${text}"\n\n` +
    `🔄 Генерирую пост...\n\n` +
    `(Это демо-версия. Полная генерация с OpenAI будет доступна после настройки API ключа)`
  );
});

// Обработка ошибок
bot.catch((err) => {
  console.error("❌ Bot error:", err);
});

// Экспортируем бота и обработчик для webhook
export default bot;

// Экспортируем обработчик для webhook
import { webhookCallback } from "grammy";
export const webhookHandler = webhookCallback(bot, "hono");

// Функция для запуска бота (для polling режима)
export async function startBot() {
  try {
    console.log("🤖 Bot starting...");
    await bot.init();
    console.log("✅ Bot initialized");
  } catch (error) {
    console.error("❌ Bot start error:", error);
    throw error;
  }
}
