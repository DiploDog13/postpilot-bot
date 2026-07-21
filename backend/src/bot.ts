import { Bot, Context, SessionFlavor, session, InlineKeyboard } from "grammy";
import { ChatMember } from "grammy/types";
import { generatePost } from "./services/openai";
import { 
  getUserByTelegramId, 
  createUser, 
  saveDraft, 
  updateDraft, 
  getDraftsByUser,
  incrementTransformCount,
  getTransformCount
} from "./services/database";
import { sendTelegramMessage, sendVoiceTranscription } from "./services/telegram";

// Определяем тип данных сессии
interface SessionData {
  transformCount: number;
  currentDraftId?: number;
  tempVoiceMessage?: string;
  brandVoiceId?: number;
}

// Создаем тип контекста с сессией
type MyContext = Context & SessionFlavor<SessionData>;

// Инициализация бота с правильным типом
const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);

// Настройка мидлвара сессии
bot.use(session({
  initial: (): SessionData => ({
    transformCount: 0,
  }),
}));

// Команда /start
bot.command("start", async (ctx: MyContext) => {
  const telegramId = ctx.from?.id;
  const username = ctx.from?.username;
  
  if (!telegramId) {
    await ctx.reply("❌ Не удалось идентифицировать пользователя.");
    return;
  }

  try {
    // Проверяем или создаем пользователя
    let user = await getUserByTelegramId(telegramId);
    if (!user) {
      user = await createUser(telegramId, username);
    }

    // Открываем Mini App
    const miniAppUrl = process.env.MINI_APP_URL || "https://your-frontend-domain.com";
    const keyboard = new InlineKeyboard().webApp(
      "🚀 Открыть приложение", 
      `${miniAppUrl}?userId=${telegramId}`
    );

    await ctx.reply(
      `👋 Привет, ${ctx.from?.first_name || "пользователь"}!\n\n` +
      "Я помогу превратить твои идеи, голосовые сообщения и ссылки в готовые посты для соцсетей.\n\n" +
      "📌 Используй кнопку ниже, чтобы открыть панель управления, или просто перешли мне любое сообщение!",
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply("❌ Произошла ошибка. Попробуй позже.");
  }
});

// Обработка пересланных сообщений
bot.on("message", async (ctx: MyContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // Проверяем лимиты
  const count = await getTransformCount(telegramId);
  if (count >= 10) {
    // Проверяем, есть ли Pro подписка
    const user = await getUserByTelegramId(telegramId);
    if (!user || user.subscription !== "pro") {
      await ctx.reply(
        "🎯 Ты использовал все 10 бесплатных трансформаций!\n\n" +
        "Получи доступ к безлимитным генерациям и премиум-функциям за 500 Telegram Stars. ⭐️",
        {
          reply_markup: new InlineKeyboard().text(
            "💎 Купить Pro", 
            "buy_pro"
          ),
        }
      );
      return;
    }
  }

  // Обработка голосовых сообщений
  if (ctx.message?.voice) {
    const fileId = ctx.message.voice.file_id;
    ctx.session.tempVoiceMessage = fileId; // Теперь session доступен!
    
    await ctx.reply("🎤 Распознаю голосовое сообщение...");
    
    try {
      const transcription = await sendVoiceTranscription(ctx, fileId);
      ctx.session.tempVoiceMessage = transcription;
      
      // Генерируем пост
      const postStyles = await generatePost(transcription, "auto");
      const keyboard = new InlineKeyboard()
        .text("📝 Сохранить", `save_voice_${transcription.substring(0, 10)}`);
      
      await ctx.reply(
        `📝 Транскрипция:\n\n${transcription}\n\n` +
        "Что делать с этим текстом? Выбери стиль поста или сохрани как есть.",
        { reply_markup: keyboard }
      );
    } catch (error) {
      console.error("Voice transcription error:", error);
      await ctx.reply("❌ Не удалось распознать голосовое сообщение.");
    }
    return;
  }

  // Обработка текстовых сообщений
  if (ctx.message?.text) {
    const text = ctx.message.text;
    
    // Игнорируем команды
    if (text.startsWith("/")) return;
    
    // Сохраняем сообщение в сессию
    ctx.session.currentDraftId = Date.now();
    
    try {
      // Генерируем 3 варианта поста
      const styles = ["viral", "professional", "funny"];
      const generatedPosts = await Promise.all(
        styles.map(style => generatePost(text, style))
      );
      
      // Отправляем результат
      const keyboard = new InlineKeyboard()
        .text("📝 Сохранить", `save_text_${ctx.session.currentDraftId}`)
        .text("🔄 Еще варианты", `regenerate_${ctx.session.currentDraftId}`);
      
      let response = "🎯 Вот варианты постов для твоего текста:\n\n";
      styles.forEach((style, index) => {
        response += `*${style.toUpperCase()}*:\n${generatedPosts[index]}\n\n`;
      });
      
      await ctx.reply(response, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
      
      // Инкрементируем счетчик трансформаций
      await incrementTransformCount(telegramId);
    } catch (error) {
      console.error("Generation error:", error);
      await ctx.reply("❌ Не удалось сгенерировать посты. Попробуй позже.");
    }
    return;
  }

  // Обработка других типов сообщений
  await ctx.reply(
    "📨 Отлично! Я получил твое сообщение.\n\n" +
    "Чтобы я мог его обработать:\n" +
    "• Перешли мне текст для генерации поста\n" +
    "• Отправь голосовое сообщение для транскрипции\n" +
    "• Или открой панель управления кнопкой ниже",
    {
      reply_markup: new InlineKeyboard().webApp(
        "🚀 Открыть приложение",
        `${process.env.MINI_APP_URL || "https://your-frontend-domain.com"}`
      ),
    }
  );
});

// Обработка callback-запросов (кнопки)
bot.on("callback_query:data", async (ctx: MyContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const data = ctx.callbackQuery.data;
  console.log(`Callback data: ${data}`);

  // Покупка Pro
  if (data === "buy_pro") {
    try {
      // Здесь должна быть логика платежей через Telegram Stars
      await ctx.reply(
        "⭐️ Отлично! Нажми на кнопку ниже, чтобы оплатить 500 Stars.\n\n" +
        "После оплаты ты получишь безлимитный доступ ко всем функциям на месяц.",
        {
          reply_markup: new InlineKeyboard().text(
            "💳 Оплатить 500 Stars",
            "pay_500_stars"
          ),
        }
      );
    } catch (error) {
      console.error("Pro upgrade error:", error);
      await ctx.reply("❌ Ошибка при оформлении подписки.");
    }
    return;
  }

  // Сохранение черновика
  if (data.startsWith("save_") || data.startsWith("save_text_")) {
    try {
      const message = ctx.callbackQuery.message;
      if (!message) return;
      
      const draft = {
        user_id: telegramId,
        content: message.text || "Черновик",
        style: "auto",
        status: "draft",
      };
      
      await saveDraft(draft);
      ctx.session.transformCount += 1; // Теперь session доступен!
      
      await ctx.answerCallbackQuery({
        text: "✅ Черновик сохранен!",
        show_alert: false,
      });
      
      await ctx.editMessageReplyMarkup({
        reply_markup: new InlineKeyboard().text("📝 Просмотреть", "view_drafts"),
      });
    } catch (error) {
      console.error("Save draft error:", error);
      await ctx.answerCallbackQuery("❌ Не удалось сохранить");
    }
    return;
  }

  // Регенерация поста
  if (data.startsWith("regenerate_")) {
    await ctx.answerCallbackQuery("🔄 Генерирую новые варианты...");
    // Здесь логика регенерации
    await ctx.reply("🔄 Новые варианты генерируются...");
    return;
  }

  // Просмотр черновиков
  if (data === "view_drafts") {
    try {
      const drafts = await getDraftsByUser(telegramId);
      if (drafts.length === 0) {
        await ctx.reply("📝 У тебя пока нет сохраненных черновиков.");
        return;
      }
      
      let response = "📝 Твои черновики:\n\n";
      drafts.slice(0, 5).forEach((draft, index) => {
        const preview = draft.content.substring(0, 100) + "...";
        response += `${index + 1}. ${preview}\n`;
      });
      
      await ctx.reply(response);
    } catch (error) {
      console.error("Get drafts error:", error);
      await ctx.reply("❌ Не удалось загрузить черновики.");
    }
    return;
  }
});

// Обработка ошибок
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Запуск бота
export async function startBot() {
  try {
    // Устанавливаем вебхук или используем polling
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      await bot.api.setWebhook(webhookUrl);
      console.log(`✅ Webhook set to: ${webhookUrl}`);
    } else {
      await bot.start();
      console.log("✅ Bot started with polling");
    }
  } catch (error) {
    console.error("Failed to start bot:", error);
    throw error;
  }
}

export default bot;
