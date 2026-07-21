import { Context, SessionFlavor, session } from 'grammy';
import {
  createBot,
  sendInvoice,
  createStyleKeyboard,
  createActionKeyboard,
  createUpgradeKeyboard,
} from './services/telegram';
import {
  getOrCreateUser,
  canTransform,
  incrementTransforms,
  upgradeToPro,
  createDraft,
  getDraftById,
  updateDraft,
  getBrandVoicesByUserId,
} from './services/database';
import { generatePost, transcribeVoice } from './services/openai';
import { generateToken } from './services/auth';

interface SessionData {
  currentDraftId?: number;
  inputText?: string;
}

type BotContext = Context & SessionFlavor<SessionData>;

const bot = createBot<BotContext>();

bot.use(
  session({
    initial: (): SessionData => ({}),
  })
);

bot.command('start', async (ctx) => {
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);
  const token = generateToken(user.id);

  const miniAppUrl = `${process.env.MINI_APP_URL}?token=${token}`;

  await ctx.reply(
    `👋 Welcome to PostPilot!\n\nTransform your messages into viral posts with AI.\n\n📊 <b>Your Stats:</b>\n• Tier: ${user.tier === 'pro' ? '⭐ Pro' : 'Free'}\n• Transforms today: ${user.transforms_today}/10\n\n🚀 <a href="${miniAppUrl}">Open Dashboard</a>`,
    { parse_mode: 'HTML' }
  );
});

bot.on('message:forward_origin', async (ctx) => {
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);

  if (!(await canTransform(user))) {
    await ctx.reply('⚠️ Daily limit reached! Upgrade to Pro for unlimited transforms.', {
      reply_markup: createUpgradeKeyboard(),
    });
    return;
  }

  const inputText = ctx.message.text || ctx.message.caption || '';
  if (!inputText) {
    await ctx.reply('Please forward a message with text content.');
    return;
  }

  const draft = await createDraft(user.id, inputText, 'forward', 'pending', '');
  ctx.session.currentDraftId = draft.id;
  ctx.session.inputText = inputText;

  await ctx.reply('✨ Choose a style for your post:', {
    reply_markup: createStyleKeyboard(draft.id),
  });
});

bot.on('message:voice', async (ctx) => {
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);

  if (!(await canTransform(user))) {
    await ctx.reply('⚠️ Daily limit reached! Upgrade to Pro for unlimited transforms.', {
      reply_markup: createUpgradeKeyboard(),
    });
    return;
  }

  const file = await ctx.api.getFile(ctx.message.voice.file_id);

  if (!file.file_path) {
    await ctx.reply('Failed to fetch voice file.');
    return;
  }

  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  const response = await fetch(fileUrl);
  const audioBuffer = Buffer.from(await response.arrayBuffer());

  const transcription = await transcribeVoice(audioBuffer);

  const draft = await createDraft(user.id, transcription, 'voice', 'pending', '');
  ctx.session.currentDraftId = draft.id;
  ctx.session.inputText = transcription;

  await ctx.reply('✨ Choose a style for your post:', {
    reply_markup: createStyleKeyboard(draft.id),
  });
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  if (text.startsWith('http')) {
    const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);

    if (!(await canTransform(user))) {
      await ctx.reply('⚠️ Daily limit reached! Upgrade to Pro for unlimited transforms.', {
        reply_markup: createUpgradeKeyboard(),
      });
      return;
    }

    const draft = await createDraft(user.id, text, 'url', 'pending', '');
    ctx.session.currentDraftId = draft.id;
    ctx.session.inputText = text;

    await ctx.reply('✨ Choose a style for your post:', {
      reply_markup: createStyleKeyboard(draft.id),
    });
  }
});

bot.callbackQuery(/style_(\d+)_(.+)/, async (ctx) => {
  const draftId = parseInt(ctx.match[1], 10);
  const style = ctx.match[2];

  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);
  const draft = await getDraftById(draftId, user.id);

  if (!draft) {
    await ctx.answerCallbackQuery({ text: 'Draft not found' });
    return;
  }

  await ctx.answerCallbackQuery({ text: 'Generating...' });

  const brandVoices = await getBrandVoicesByUserId(user.id);
  const examples = brandVoices.length > 0 ? brandVoices[0].examples : undefined;

  const generatedPost = await generatePost(
    ctx.session.inputText || draft.input_text || '',
    style,
    examples
  );

  await updateDraft(draftId, user.id, {
    generated_post: generatedPost,
    style,
  });

  await incrementTransforms(user.id);

  await ctx.editMessageText(`📝 ${style.charAt(0).toUpperCase() + style.slice(1)} Style:\n\n${generatedPost}`, {
    reply_markup: createActionKeyboard(draftId),
  });
});

bot.callbackQuery(/copy_(\d+)/, async (ctx) => {
  const draftId = parseInt(ctx.match[1], 10);
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);
  const draft = await getDraftById(draftId, user.id);

  if (!draft) {
    await ctx.answerCallbackQuery({ text: 'Draft not found' });
    return;
  }

  await ctx.answerCallbackQuery({ text: 'Copied!' });
  await ctx.reply(draft.generated_post);
});

bot.callbackQuery(/save_(\d+)/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Saved to dashboard!' });
});

bot.callbackQuery(/regenerate_(\d+)/, async (ctx) => {
  const draftId = parseInt(ctx.match[1], 10);
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);
  const draft = await getDraftById(draftId, user.id);

  if (!draft) {
    await ctx.answerCallbackQuery({ text: 'Draft not found' });
    return;
  }

  if (!(await canTransform(user))) {
    await ctx.answerCallbackQuery({ text: 'Daily limit reached' });
    return;
  }

  await ctx.answerCallbackQuery({ text: 'Regenerating...' });

  const generatedPost = await generatePost(
    ctx.session.inputText || draft.input_text || '',
    draft.style || 'professional'
  );

  await updateDraft(draftId, user.id, {
    generated_post: generatedPost,
  });

  await incrementTransforms(user.id);

  await ctx.editMessageText(
    `📝 ${draft.style.charAt(0).toUpperCase() + draft.style.slice(1)} Style:\n\n${generatedPost}`,
    {
      reply_markup: createActionKeyboard(draftId),
    }
  );
});

bot.callbackQuery(/share_(\d+)/, async (ctx) => {
  const draftId = parseInt(ctx.match[1], 10);
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);
  const draft = await getDraftById(draftId, user.id);

  if (!draft) {
    await ctx.answerCallbackQuery({ text: 'Draft not found' });
    return;
  }

  await ctx.answerCallbackQuery({
    text: 'Use @PostPilotBot in any chat to share this draft',
  });
});

bot.callbackQuery('upgrade_pro', async (ctx) => {
  await ctx.answerCallbackQuery();

  if (!ctx.chat) {
    return;
  }

  await sendInvoice(
    bot,
    ctx.chat.id,
    'PostPilot Pro',
    'Unlimited transforms and premium features',
    500,
    'XTR'
  );
});

bot.on('pre_checkout_query', async (ctx) => {
  await bot.api.answerPreCheckoutQuery(ctx.update.pre_checkout_query.id, true);
});

bot.on('message:successful_payment', async (ctx) => {
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);
  await upgradeToPro(user.id);
  await ctx.reply('🎉 Upgrade successful! You now have unlimited transforms.');
});

bot.inlineQuery(/.*/, async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  const user = await getOrCreateUser(ctx.from!.id, ctx.from!.username);

  if (!query) {
    await ctx.answerInlineQuery([]);
    return;
  }

  const draft = await createDraft(user.id, query, 'inline', 'viral', '');
  const generatedPost = await generatePost(query, 'viral');

  await updateDraft(draft.id, user.id, {
    generated_post: generatedPost,
    style: 'viral',
  });

  await ctx.answerInlineQuery([
    {
      type: 'article',
      id: draft.id.toString(),
      title: 'Viral Post',
      description: generatedPost.substring(0, 100),
      input_message_content: {
        message_text: generatedPost,
      },
    },
  ]);
});

export default bot;
