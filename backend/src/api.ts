import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { loggerMiddleware } from './middleware/logger';
import { validateTelegramInitData, generateToken } from './services/auth';
import {
  getOrCreateUser,
  getUserById,
  getDraftsByUserId,
  getDraftById,
  createDraft,
  updateDraft,
  deleteDraft,
  getBrandVoicesByUserId,
  createBrandVoice,
  getAnalytics,
  upgradeToPro,
} from './services/database';
import { generatePost } from './services/openai';

type AppVariables = {
  userId: number;
};

const app = new Hono<{ Variables: AppVariables }>();

app.use('*', loggerMiddleware);

function parseId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

app.post('/api/auth/validate', async (c) => {
  const body = await c.req.json();
  const initData = body?.initData as string | undefined;

  if (!initData) {
    return c.json({ error: 'No init data' }, 400);
  }

  if (!validateTelegramInitData(initData)) {
    return c.json({ error: 'Invalid init data' }, 401);
  }

  const params = new URLSearchParams(initData);
  const userParam = params.get('user');

  if (!userParam) {
    return c.json({ error: 'No user data' }, 400);
  }

  const userData = JSON.parse(userParam) as { id: number; username?: string };
  const user = await getOrCreateUser(userData.id, userData.username);
  const token = generateToken(user.id);

  return c.json({ token, user });
});

app.get('/api/user', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await getUserById(userId);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(user);
});

app.get('/api/drafts', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const drafts = await getDraftsByUserId(userId);
  return c.json(drafts);
});

app.get('/api/drafts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const draftId = parseId(c.req.param('id'));

  if (draftId === null) {
    return c.json({ error: 'Invalid draft id' }, 400);
  }

  const draft = await getDraftById(draftId, userId);

  if (!draft) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  return c.json(draft);
});

app.post('/api/drafts', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const input_text = body?.input_text as string | undefined;
  const input_type = (body?.input_type as string | undefined) ?? 'manual';
  const style = (body?.style as string | undefined) ?? 'professional';
  const generated_post = (body?.generated_post as string | undefined) ?? '';

  const draft = await createDraft(
    userId,
    input_text,
    input_type,
    style,
    generated_post
  );

  return c.json(draft);
});

app.put('/api/drafts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const draftId = parseId(c.req.param('id'));

  if (draftId === null) {
    return c.json({ error: 'Invalid draft id' }, 400);
  }

  const updates = await c.req.json();
  const draft = await updateDraft(draftId, userId, updates);

  return c.json(draft);
});

app.delete('/api/drafts/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const draftId = parseId(c.req.param('id'));

  if (draftId === null) {
    return c.json({ error: 'Invalid draft id' }, 400);
  }

  await deleteDraft(draftId, userId);
  return c.json({ success: true });
});

app.post('/api/generate', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const input_text = (body?.input_text as string | undefined) ?? '';
  const style = (body?.style as string | undefined) ?? 'professional';
  const use_brand_voice = Boolean(body?.use_brand_voice);

  let brandVoiceExamples: string[] | undefined;

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
  const body = await c.req.json();

  const name = (body?.name as string | undefined) ?? 'Default voice';
  const tone = body?.tone as string | undefined;
  const examples = Array.isArray(body?.examples) ? body.examples : [];

  const voice = await createBrandVoice(userId, name, tone, examples);
  return c.json(voice);
});

app.get('/api/analytics', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const daysRaw = Number(c.req.query('days') ?? '7');
  const days = Number.isFinite(daysRaw) ? daysRaw : 7;

  const analytics = await getAnalytics(userId, days);
  return c.json(analytics);
});

app.post('/api/upgrade', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await upgradeToPro(userId);
  return c.json(user);
});

export default app;
