import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  tier: 'free' | 'pro';
  subscription_end?: Date;
  transforms_today: number;
  transforms_reset_at: Date;
  referrer_id?: number;
  referred_count: number;
  created_at: Date;
}

export interface Draft {
  id: number;
  user_id: number;
  input_text?: string;
  input_type: 'forwarded' | 'voice' | 'link';
  style: 'professional' | 'viral' | 'funny' | 'sales' | 'educational';
  generated_post: string;
  original_message_id?: number;
  is_published: boolean;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface BrandVoice {
  id: number;
  user_id: number;
  name?: string;
  tone?: string;
  examples: string[];
  created_at: Date;
}

export interface Analytics {
  id: number;
  user_id: number;
  event_type: 'transform' | 'draft_saved' | 'post_published' | 'shared';
  metadata?: any;
  created_at: Date;
}

export interface Payment {
  id: number;
  user_id: number;
  amount_stars: number;
  status: 'pending' | 'completed' | 'failed';
  telegram_payment_id?: string;
  created_at: Date;
}

// User operations
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0] || null;
}

export async function createUser(telegramId: number, username?: string, referrerId?: number): Promise<User> {
  const result = await pool.query(
    `INSERT INTO users (telegram_id, username, referrer_id) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [telegramId, username, referrerId]
  );
  return result.rows[0];
}

export async function updateUserTier(userId: number, tier: 'free' | 'pro', subscriptionEnd?: Date): Promise<void> {
  await pool.query(
    'UPDATE users SET tier = $1, subscription_end = $2 WHERE id = $3',
    [tier, subscriptionEnd, userId]
  );
}

export async function incrementTransformCount(userId: number): Promise<void> {
  await pool.query(
    'UPDATE users SET transforms_today = transforms_today + 1 WHERE id = $1',
    [userId]
  );
}

export async function resetDailyTransforms(userId: number): Promise<void> {
  await pool.query(
    'UPDATE users SET transforms_today = 0, transforms_reset_at = NOW() + INTERVAL \'1 day\' WHERE id = $1',
    [userId]
  );
}

export async function checkRateLimit(userId: number): Promise<{ allowed: boolean; remaining: number }> {
  const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const userData = user.rows[0];
  
  if (userData.tier === 'pro') {
    return { allowed: true, remaining: -1 }; // Unlimited
  }
  
  if (new Date(userData.transforms_reset_at) < new Date()) {
    await resetDailyTransforms(userId);
    await incrementTransformCount(userId);
    return { allowed: true, remaining: 9 };
  }
  
  if (userData.transforms_today >= 10) {
    return { allowed: false, remaining: 0 };
  }
  
  await incrementTransformCount(userId);
  return { allowed: true, remaining: 10 - userData.transforms_today - 1 };
}

// Draft operations
export async function createDraft(
  userId: number,
  inputText: string,
  inputType: 'forwarded' | 'voice' | 'link',
  style: 'professional' | 'viral' | 'funny' | 'sales' | 'educational',
  generatedPost: string,
  originalMessageId?: number
): Promise<Draft> {
  const result = await pool.query(
    `INSERT INTO drafts (user_id, input_text, input_type, style, generated_post, original_message_id) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
    [userId, inputText, inputType, style, generatedPost, originalMessageId]
  );
  return result.rows[0];
}

export async function getDraftsByUserId(userId: number, limit = 20): Promise<Draft[]> {
  const result = await pool.query(
    'SELECT * FROM drafts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

export async function getDraftById(draftId: number): Promise<Draft | null> {
  const result = await pool.query('SELECT * FROM drafts WHERE id = $1', [draftId]);
  return result.rows[0] || null;
}

export async function updateDraft(draftId: number, updates: Partial<Draft>): Promise<Draft> {
  const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE drafts SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [draftId, ...values]
  );
  return result.rows[0];
}

export async function deleteDraft(draftId: number): Promise<void> {
  await pool.query('DELETE FROM drafts WHERE id = $1', [draftId]);
}

// Brand voice operations
export async function createBrandVoice(
  userId: number,
  name: string,
  tone: string,
  examples: string[]
): Promise<BrandVoice> {
  const result = await pool.query(
    `INSERT INTO brand_voices (user_id, name, tone, examples) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [userId, name, tone, examples]
  );
  return result.rows[0];
}

export async function getBrandVoicesByUserId(userId: number): Promise<BrandVoice[]> {
  const result = await pool.query(
    'SELECT * FROM brand_voices WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function getLatestBrandVoice(userId: number): Promise<BrandVoice | null> {
  const result = await pool.query(
    'SELECT * FROM brand_voices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

// Analytics operations
export async function logAnalytics(
  userId: number,
  eventType: 'transform' | 'draft_saved' | 'post_published' | 'shared',
  metadata?: any
): Promise<void> {
  await pool.query(
    'INSERT INTO analytics (user_id, event_type, metadata) VALUES ($1, $2, $3)',
    [userId, eventType, metadata]
  );
}

export async function getAnalyticsByUserId(userId: number, days = 30): Promise<Analytics[]> {
  const result = await pool.query(
    `SELECT * FROM analytics 
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days' 
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getTransformCountToday(userId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM analytics 
     WHERE user_id = $1 AND event_type = 'transform' 
     AND DATE(created_at) = CURRENT_DATE`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

// Payment operations
export async function createPayment(
  userId: number,
  amountStars: number,
  telegramPaymentId?: string
): Promise<Payment> {
  const result = await pool.query(
    `INSERT INTO payments (user_id, amount_stars, telegram_payment_id) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [userId, amountStars, telegramPaymentId]
  );
  return result.rows[0];
}

export async function updatePaymentStatus(
  paymentId: number,
  status: 'pending' | 'completed' | 'failed'
): Promise<void> {
  await pool.query(
    'UPDATE payments SET status = $1 WHERE id = $2',
    [status, paymentId]
  );
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username VARCHAR(255),
      tier VARCHAR(50) DEFAULT 'free',
      subscription_end TIMESTAMP,
      transforms_today INT DEFAULT 0,
      transforms_reset_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
      referrer_id INT,
      referred_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      input_text TEXT,
      input_type VARCHAR(50),
      style VARCHAR(50),
      generated_post TEXT NOT NULL,
      original_message_id INT,
      is_published BOOLEAN DEFAULT FALSE,
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS brand_voices (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      name VARCHAR(100),
      tone TEXT,
      examples TEXT[],
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      event_type VARCHAR(50),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id),
      amount_stars INT,
      status VARCHAR(50),
      telegram_payment_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
