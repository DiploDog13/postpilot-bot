import { Bot, Context, InlineQuery } from 'grammy';
import { createBot, sendMessage, createStyleKeyboard, createUpgradeKeyboard, createWelcomeKeyboard, sendInvoice, answerPreCheckoutQuery } from './services/telegram';
import { getUserByTelegramId, createUser, checkRateLimit, createDraft, getDraftById, updateDraft, logAnalytics, updateUserTier, createPayment, updatePaymentStatus } from './services/database';
import { generatePost, transcribeVoice, PostStyle } from './services/openai';
import dotenv from 'dotenv';

dotenv.config();

const bot = createBot();
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://example.com';

interface BotContext extends Context {
  userStyle?: PostStyle;
  userDraftId?: number;
}

// Start command
bot.command('start', async (ctx: BotContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  let user = await getUserByTelegramId(telegramId);
  if (!user) {
    user = await createUser(telegramId, ctx.from?.username);
  }

  const welcomeMessage = `
🚀 <b>Welcome to PostPilot!</b>

Transform your ideas into viral Telegram posts instantly.

✨ <b>Features:</b>
• Forward any message → get 3 style options
• Voice notes → auto-transcribe & generate
• 10 free transforms/day
• Pro: Unlimited + analytics

<b>Get started:</b>
1. Forward a message to me
2. Choose your style (Professional, Viral, Funny)
3. Get your ready-to-publish post!

Click below to open your dashboard 👇
  `;

  await sendMessage(bot, telegramId, welcomeMessage, createWelcomeKeyboard());
  await logAnalytics(user.id, 'transform', { action: 'start' });
});

// Handle forwarded messages
bot.on('message:forward_origin', async (ctx: BotContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  let user = await getUserByTelegramId(telegramId);
  if (!user) {
    user = await createUser(telegramId, ctx.from?.username);
  }

  const rateLimit = await checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    await sendMessage(bot, telegramId, '⚠️ <b>Daily limit reached!</b>\n\nUpgrade to Pro for unlimited transforms.', createUpgradeKeyboard());
    return;
  }

  const messageText = ctx.message?.text || ctx.message?.caption || '';
  if (!messageText) {
    await sendMessage(bot, telegramId, 'Please forward a message with text content.');
    return;
  }

  ctx.userDraftId = await createDraft(user.id, messageText, 'forwarded', 'professional', '');
  
  const styleMessage = `
📝 <b>Choose your style:</b>

${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}
  `;

  await sendMessage(bot, telegramId, styleMessage, {
    inline_keyboard: [
      [
        { text: '👔 Professional', callback_data: 'style_professional' },
        { text: '🔥 Viral', callback_data: 'style_viral' },
      ],
      [
        { text: '😄 Funny', callback_data: 'style_funny' },
        { text: '💰 Sales', callback_data: 'style_sales' },
      ],
      [
        { text: '📚 Educational', callback_data: 'style_educational' },
      ],
    ],
  });

  await logAnalytics(user.id, 'transform', { action: 'forward_received' });
});

// Handle voice messages
bot.on('message:voice', async (ctx: BotContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  let user = await getUserByTelegramId(telegramId);
  if (!user) {
    user = await createUser(telegramId, ctx.from?.username);
  }

  const rateLimit = await checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    await sendMessage(bot, telegramId, '⚠️ <b>Daily limit reached!</b>\n\nUpgrade to Pro for unlimited transforms.', createUpgradeKeyboard());
    return;
  }

  const voiceFile = ctx.message?.voice;
  if (!voiceFile) return;

  await sendMessage(bot, telegramId, '🎤 Transcribing your voice note...');

  try {
    const transcript = await transcribeVoice(voiceFile.file_id, process.env.TELEGRAM_BOT_TOKEN || '');
    ctx.userDraftId = await createDraft(user.id, transcript, 'voice', 'professional', '');
    
    const styleMessage = `📝 <b>Transcript:</b>\n\n${transcript.substring(0, 200)}...\n\nChoose your style:`;

    await sendMessage(bot, telegramId, styleMessage, {
      inline_keyboard: [
        [
          { text: '👔 Professional', callback_data: 'style_professional' },
          { text: '🔥 Viral', callback_data: 'style_viral' },
        ],
        [
          { text: '😄 Funny', callback_data: 'style_funny' },
          { text: '💰 Sales', callback_data: 'style_sales' },
        ],
        [
          { text: '📚 Educational', callback_data: 'style_educational' },
        ],
      ],
    });

    await logAnalytics(user.id, 'transform', { action: 'voice_transcribed' });
  } catch (error) {
    await sendMessage(bot, telegramId, '❌ Failed to transcribe voice note. Please try again.');
  }
});

// Handle text messages (URLs or ideas)
bot.on('message:text', async (ctx: BotContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const text = ctx.message?.text || '';
  
  // Check if it's a URL
  if (text.match(/^https?:\/\//i)) {
    let user = await getUserByTelegramId(telegramId);
    if (!user) {
      user = await createUser(telegramId, ctx.from?.username);
    }

    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      await sendMessage(bot, telegramId, '⚠️ <b>Daily limit reached!</b>\n\nUpgrade to Pro for unlimited transforms.', createUpgradeKeyboard());
      return;
    }

    await sendMessage(bot, telegramId, '🔗 Fetching content from URL...');
    
    try {
      const post = await generatePost(text, 'professional');
      ctx.userDraftId = await createDraft(user.id, text, 'link', 'professional', post);
      
      await sendMessage(bot, telegramId, `✨ <b>Generated Post:</b>\n\n${post}`, createStyleKeyboard(ctx.userDraftId));
      await logAnalytics(user.id, 'transform', { action: 'url_processed' });
    } catch (error) {
      await sendMessage(bot, telegramId, '❌ Failed to process URL. Please try again.');
    }
  }
});

// Handle style selection
bot.callbackQuery(/style_(.+)/, async (ctx: BotContext) => {
  const style = ctx.match![1] as PostStyle;
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getUserByTelegramId(telegramId);
  if (!user) return;

  const draft = await getDraftById(ctx.userDraftId || 0);
  if (!draft) return;

  await ctx.answerCallbackQuery();
  await sendMessage(bot, telegramId, '✨ Generating your post...');

  try {
    const generatedPost = await generatePost(draft.input_text || '', style);
    await updateDraft(draft.id, { generated_post: generatedPost, style });
    
    await sendMessage(bot, telegramId, `✨ <b>Generated Post (${style}):</b>\n\n${generatedPost}`, createStyleKeyboard(draft.id));
    await logAnalytics(user.id, 'transform', { action: 'post_generated', style });
  } catch (error) {
    await sendMessage(bot, telegramId, '❌ Failed to generate post. Please try again.');
  }
});

// Handle copy button
bot.callbackQuery(/copy_(\d+)/, async (ctx: BotContext) => {
  const draftId = parseInt(ctx.match![1]);
  const draft = await getDraftById(draftId);
  
  if (draft) {
    await ctx.answerCallbackQuery({ text: '✅ Copied to clipboard!' });
    await logAnalytics(draft.user_id, 'draft_saved', { action: 'copy' });
  }
});

// Handle save button is handled in the API
bot.callbackQuery(/save_(\d+)/, async (ctx: BotContext) => {
  await ctx.answerCallbackQuery({ text: '✅ Draft saved! Open dashboard to view.' });
});

// Handle regenerate button
bot.callbackQuery(/regenerate_(\d+)/, async (ctx: BotContext) => {
  const draftId = parseInt(ctx.match![1]);
  const draft = await getDraftById(draftId);
  const telegramId = ctx.from?.id;
  
  if (draft && telegramId) {
    const user = await getUserByTelegramId(telegramId);
    if (!user) return;

    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      await sendMessage(bot, telegramId, '⚠️ <b>Daily limit reached!</b>\n\nUpgrade to Pro for unlimited transforms.', createUpgradeKeyboard());
      return;
    }

    await ctx.answerCallbackQuery();
    await sendMessage(bot, telegramId, '✨ Regenerating...');

    try {
      const newPost = await generatePost(draft.input_text || '', draft.style as PostStyle);
      await updateDraft(draft.id, { generated_post: newPost });
      
      await sendMessage(bot, telegramId, `✨ <b>Regenerated Post:</b>\n\n${newPost}`, createStyleKeyboard(draft.id));
      await logAnalytics(user.id, 'transform', { action: 'regenerate' });
    } catch (error) {
      await sendMessage(bot, telegramId, '❌ Failed to regenerate. Please try again.');
    }
  }
});

// Handle share button
bot.callbackQuery(/share_(\d+)/, async (ctx: BotContext) => {
  const draftId = parseInt(ctx.match![1]);
  const draft = await getDraftById(draftId);
  
  if (draft) {
    await ctx.answerCallbackQuery({ text: '✅ Use @PostPilotBot in any chat to share!' });
    await logAnalytics(draft.user_id, 'shared', { draftId });
  }
});

// Inline mode
bot.inlineQuery(async (ctx: BotContext) => {
  const query = ctx.inlineQuery?.query || '';
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getUserByTelegramId(telegramId);
  if (!user) return;

  if (!query) {
    return ctx.answerInlineQuery([]);
  }

  const results = [
    {
      type: 'article',
      id: '1',
      title: '📝 Professional Post',
      input_message_content: {
        message_text: `📝 <b>Professional Draft:</b>\n\n${query.substring(0, 100)}...\n\n<i>Generated by PostPilot</i>`,
        parse_mode: 'HTML',
      },
      reply_markup: {
        inline_keyboard: [
          [{ text: '📲 Open in PostPilot', web_app: { url: MINI_APP_URL } }],
        ],
      },
    },
    {
      type: 'article',
      id: '2',
      title: '🔥 Viral Post',
      input_message_content: {
        message_text: `🔥 <b>Viral Draft:</b>\n\n${query.substring(0, 100)}...\n\n<i>Generated by PostPilot</i>`,
        parse_mode: 'HTML',
      },
      reply_markup: {
        inline_keyboard: [
          [{ text: '📲 Open in PostPilot', web_app: { url: MINI_APP_URL } }],
        ],
      },
    },
    {
      type: 'article',
      id: '3',
      title: '😄 Funny Post',
      input_message_content: {
        message_text: `😄 <b>Funny Draft:</b>\n\n${query.substring(0, 100)}...\n\n<i>Generated by PostPilot</i>`,
        parse_mode: 'HTML',
      },
      reply_markup: {
        inline_keyboard: [
          [{ text: '📲 Open in PostPilot', web_app: { url: MINI_APP_URL } }],
        ],
      },
    },
  ];

  await ctx.answerInlineQuery(results, { cache_time: 0 });
});

// Pre-checkout query
bot.on('pre_checkout_query', async (ctx: BotContext) => {
  await answerPreCheckoutQuery(bot, ctx.id, true);
});

// Successful payment
bot.on('message:successful_payment', async (ctx: BotContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await getUserByTelegramId(telegramId);
  if (!user) return;

  const payment = ctx.message?.successful_payment;
  if (!payment) return;

  const subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  await updateUserTier(user.id, 'pro', subscriptionEnd);
  await createPayment(user.id, payment.total_amount, payment.telegram_payment_charge_id);
  await updatePaymentStatus(parseInt(payment.telegram_payment_charge_id), 'completed');
  
  await sendMessage(bot, telegramId, '✅ <b>Welcome to PostPilot Pro!</b>\n\nUnlimited transforms unlocked. Enjoy!');
  await logAnalytics(user.id, 'transform', { action: 'upgrade_pro' });
});

export default bot;
