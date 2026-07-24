// backend/src/bot.ts
import { Bot, Context, SessionFlavor, session, webhookCallback } from "grammy";

// Тип для сессии
interface SessionData {
  count: number;
}

type MyContext = Context & SessionFlavor<SessionData>;

// Проверяем токен
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

console.log("🤖 Creating bot...");
const bot = new Bot<MyContext>(BOT_TOKEN);

// Используем сессию
bot.use(session({
  initial: () => ({ count: 0 }),
}));

// Команда /start
bot.command("start", async (ctx: MyContext) => {
  console.log("📨 /start command received from:", ctx.from?.id);
  
  await ctx.reply(
    "👋 Привет! Я PostPilot Bot!\n\n" +
    "Я помогаю создавать посты для соцсетей.\n\n" +
    "📌 Что я умею:\n" +
    "• Перешли мне любое сообщение\n" +
    "• Отправь голосовое сообщение\n" +
    "• Или просто напиши текст\n\n" +
    "Я превращу это в готовый пост! 🚀"
  );
  
  console.log("✅ /start response sent");
});

// Команда /help
bot.command("help", async (ctx: MyContext) => {
  await ctx.reply(
    "📖 Помощь по PostPilot Bot:\n\n" +
    "• /start - начать работу\n" +
    "• /help - эта справка\n" +
    "• Перешлите сообщение для генерации поста\n" +
    "• Отправьте голосовое сообщение для транскрипции\n\n" +
    "💡 Бесплатно: 10 трансформаций в день\n" +
    "⭐️ Pro: безлимитные трансформации за 500 Stars"
  );
});

// Обработка текстовых сообщений
bot.on("message:text", async (ctx: MyContext) => {
  const text = ctx.message.text;
  
  if (text.startsWith("/")) return;
  
  console.log("📨 Text message received:", text.substring(0, 50));
  
  await ctx.reply(
    `📝 Я получил твой текст:\n\n"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\n` +
    `🔄 Генерирую пост...\n\n` +
    `(Это демо-версия. Полная генерация с OpenAI будет доступна после настройки API ключа)`
  );
});

// Обработка любых других сообщений
bot.on("message", async (ctx: MyContext) => {
  console.log("📨 Other message type received");
  await ctx.reply("📨 Я получил твое сообщение! Отправь мне текст или перешли сообщение.");
});

// Обработка ошибок
bot.catch((err) => {
  console.error("❌ Bot error:", err);
});

console.log("✅ Bot created successfully");

// Экспортируем обработчик для webhook
export const webhookHandler = webhookCallback(bot, "hono");

// Экспортируем бота
export default bot;

// Функция для инициализации бота
export async function initBot() {
  try {
    console.log("🤖 Initializing bot...");
    await bot.init();
    console.log("✅ Bot initialized successfully");
    return bot;
  } catch (error) {
    console.error("❌ Bot initialization failed:", error);
    throw error;
  }
}
