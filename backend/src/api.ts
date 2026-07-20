import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { validateTelegramInitData, generateToken, verifyToken } from './services/auth';
import { getUserByTelegramId, createUser, getDraftsByUserId, getDraftById, createDraft, updateDraft, deleteDraft, getBrandVoicesByUserId, createBrandVoice, getLatestBrandVoice, getAnalyticsByUserId, getTransformCountToday, updateUserTier, createPayment, updatePaymentStatus } from './services/database';
import { generatePost, PostStyle } from './services/openai';
import { sendInvoice, createBot } from './services/telegram';
import dotenv from 'dotenv';

dotenv.config();

const api = new Hono();
const bot = createBot();

// Middleware
api.use('/*', cors({
  origin: '*',
  credentials: true,
}));

// Auth middleware
api.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  c.set('userId', decoded.userId);
  await next();
});

// Auth endpoint - validate Telegram init data and return token
api.post('/api/auth/validate', async (c) => {
  const { initData } = await c.req.json();
  
  const telegramUser = validateTelegramInitData(initData);
  if (!telegramUser) {
    return c.json({ error: 'Invalid init data' }, 400);
  }

  let user = await getUserByTelegramId(telegramUser.id);
  if (!user) {
    user = await createUser(telegramUser.id, telegramUser.username);
  }

  const token = generateToken(user.id);
  return c.json({ token, user: { id: user.id, tier: user.tier, username: user.username } });
});

// Get current user info
api.get('/api/user', async (c) => {
  const userId = c.get('userId');
  const user = await getUserByTelegramId(userId);
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: user.id,
    telegram_id: user.telegram_id,
    username: user.username,
    tier: user.tier,
    subscription_end: user.subscription_end,
    transforms_today: user.transforms_today,
    transforms_reset_at: user.transforms_reset_at,
    referred_count: user.referred_count,
  });
});

// Get all drafts for user
api.get('/api/drafts', async (c) => {
  const userId = c.get('userId');
  const drafts = await getDraftsByUserId(userId);
  return c.json(drafts);
});

// Get single draft
api.get('/api/drafts/:id', async (c) => {
  const userId = c.get('userId');
  const draftId = parseInt(c.req.param('id'));
  
  const draft = await getDraftById(draftId);
  if (!draft || draft.user_id !== userId) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  return c.json(draft);
});

// Create new draft
api.post('/api/drafts', async (c) => {
  const userId = c.get('userId');
  const { input_text, input_type, style, generated_post } = await c.req.json();
  
  const draft = await createDraft(
    userId,
    input_text,
    input_type,
    style,
    generated_post
  );

  return c.json(draft, 201);
});

// Update draft
api.put('/api/drafts/:id', async (c) => {
  const userId = c.get('userId');
  const draftId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const existingDraft = await getDraftById(draftId);
  if (!existingDraft || existingDraft.user_id !== userId) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  const updatedDraft = await updateDraft(draftId, updates);
  return c.json(updatedDraft);
});

// Delete draft
api.delete('/api/drafts/:id', async (c) => {
  const userId = c.get('userId');
  const draftId = parseInt(c.req.param('id'));
  
  const existingDraft = await getDraftById(draftId);
  if (!existingDraft || existingDraft.user_id !== userId) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  await deleteDraft(draftId);
  return c.json({ success: true });
});

// Generate post from text
api.post('/api/generate', async (c) => {
  const userId = c.get('userId');
  const { input_text, style, use_brand_voice } = await c.req.json();
  
  let brandVoiceExamples: string[] | undefined;
  if (use_brand_voice) {
    const brandVoice = await getLatestBrandVoice(userId);
    if (brandVoice) {
      brandVoiceExamples = brandVoice.examples;
    }
  }

  try {
    const generatedPost = await generatePost(input_text, style as PostStyle, brandVoiceExamples);
    
    const draft = await createDraft(
      userId,
      input_text,
      'manual',
      style as PostStyle,
      generatedPost
    );

    return c.json({ post: generatedPost, draft_id: draft.id });
  } catch (error) {
    return c.json({ error: 'Failed to generate post' }, 500);
  }
});

// Get brand voices
api.get('/api/brand-voices', async (c) => {
  const userId = c.get('userId');
  const brandVoices = await getBrandVoicesByUserId(userId);
  return c.json(brandVoices);
});

// Create brand voice
api.post('/api/brand-voices', async (c) => {
  const userId = c.get('userId');
  const { name, tone, examples } = await c.req.json();
  
  const brandVoice = await createBrandVoice(userId, name, tone, examples);
  return c.json(brandVoice, 201);
});

// Get analytics
api.get('/api/analytics', async (c) => {
  const userId = c.get('userId');
  const days = parseInt(c.req.query('days') || '30');
  
  const analytics = await getAnalyticsByUserId(userId, days);
  const transformCountToday = await getTransformCountToday(userId);
  
  return c.json({
    analytics,
    transform_count_today: transformCountToday,
  });
});

// Upgrade to Pro (send invoice)
api.post('/api/upgrade', async (c) => {
  const userId = c.get('userId');
  const user = await getUserByTelegramId(userId);
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  try {
    await sendInvoice(
      bot,
      user.telegram_id,
      'PostPilot Pro',
      'Unlimited transforms, voice transcription, analytics',
      `pro_${userId}_${Date.now()}`,
      [{ label: 'Pro monthly', amount: 500 }]
    );
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to send invoice' }, 500);
  }
});

// Get payment status
api.get('/api/payments', async (c) => {
  const userId = c.get('userId');
  // This would need a getPaymentsByUserId function in database.ts
  // For now, return empty array
  return c.json([]);
});

// Health check
api.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

export default api;
