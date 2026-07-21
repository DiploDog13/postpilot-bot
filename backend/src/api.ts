import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { loggerMiddleware } from './middleware/logger';
import { validateTelegramInitData, generateToken } from './services/auth';
import { getOrCreateUser, getDraftsByUserId, getDraftById, createDraft, updateDraft, deleteDraft, getBrandVoicesByUserId, createBrandVoice, getAnalytics, upgradeToPro } from './services/database';
import { generatePost } from './services/openai';

const app = new Hono();
app.use('*', loggerMiddleware);

app.post('/api/auth/validate', async (c) => {
  const { initData } = await c.req.json();
  
  if (!validateTelegramInitData(initData)) {
    return c.json({ error: 'Invalid init data' }, 401);
  }

  const params = new URLSearchParams(initData);
  const userParam = params.get('user');
  if (!userParam) {
    return c.json({ error: 'No user data' }, 400);
  }

  const userData = JSON.parse(userParam);
  const user = await getOrCreateUser(userData.id, userData.username);
  const token = generateToken(user.id);

  return c.json({ token, user });
});

app.get('/api/user', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await getDraftById(userId, userId);
  return c.json(user);
});

app.get('/api/drafts', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const drafts = await getDraftsByUserId(userId);
  return c.json(drafts);
});

app.get('/api/drafts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const draftId = parseInt(c.req.param('id'));
  const draft = await getDraftById(draftId, userId);
  
  if (!draft) {
    return c.json({ error: 'Draft not found' }, 404);
  }
  
  return c.json(draft);
});

app.post('/api/drafts', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { input_text, input_type, style, generated_post } = await c.req.json();
  
  const draft = await createDraft(userId, input_text, input_type, style, generated_post);
  return c.json(draft);
});

app.put('/api/drafts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const draftId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const draft = await updateDraft(draftId, userId, updates);
  return c.json(draft);
});

app.delete('/api/drafts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const draftId = parseInt(c.req.param('id'));
  
  await deleteDraft(draftId, userId);
  return c.json({ success: true });
});

app.post('/api/generate', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { input_text, style, use_brand_voice } = await c.req.json();
  
  let brandVoiceExamples;
  if (use_brand_voice) {
    const voices = await getBrandVoicesByUserId(userId);
    brandVoiceExamples = voices.length > 0 ? voices[0].examples : undefined;
  }
  
  const generatedPost = await generatePost(input_text, style, brandVoiceExamples);
  const draft = await createDraft(userId, input_text, 'manual', style, generatedPost);
  
  return c.json(draft);
});

app.get('/api/brand-voices', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const voices = await getBrandVoicesByUserId(userId);
  return c.json(voices);
});

app.post('/api/brand-voices', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { name, tone, examples } = await c.req.json();
  
  const voice = await createBrandVoice(userId, name, tone, examples);
  return c.json(voice);
});

app.get('/api/analytics', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const days = parseInt(c.req.query('days') || '7');
  const analytics = await getAnalytics(userId, days);
  return c.json(analytics);
});

app.post('/api/upgrade', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await upgradeToPro(userId);
  return c.json(user);
});

export default app;
