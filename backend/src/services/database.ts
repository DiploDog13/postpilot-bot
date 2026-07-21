import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  tier: 'free' | 'pro';
  subscription_end?: string;
  transforms_today: number;
  transforms_reset_at: string;
  referred_count: number;
  referral_code: string;
  created_at: string;
}

export interface Draft {
  id: number;
  user_id: number;
  input_text?: string;
  input_type: string;
  style: string;
  generated_post: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandVoice {
  id: number;
  user_id: number;
  name: string;
  tone?: string;
  examples: string[];
  created_at: string;
}

export interface Analytics {
  id: number;
  user_id: number;
  date: string;
  drafts_generated: number;
  drafts_published: number;
}

export interface Payment {
  id: number;
  user_id: number;
  amount: number;
  currency: string;
  status: string;
  telegram_payment_id?: string;
  created_at: string;
}

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username VARCHAR(255),
      tier VARCHAR(20) DEFAULT 'free',
      subscription_end TIMESTAMP,
      transforms_today INTEGER DEFAULT 0,
      transforms_reset_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
      referred_count INTEGER DEFAULT 0,
      referral_code VARCHAR(20) UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      input_text TEXT,
      input_type VARCHAR(50),
      style VARCHAR(50),
      generated_post TEXT NOT NULL,
      is_published BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS brand_voices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      tone TEXT,
      examples TEXT[],
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      date DATE DEFAULT CURRENT_DATE,
      drafts_generated INTEGER DEFAULT 0,
      drafts_published INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      amount INTEGER NOT NULL,
      currency VARCHAR(10) DEFAULT 'XTR',
      status VARCHAR(20) DEFAULT 'pending',
      telegram_payment_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function getOrCreateUser(telegramId: number, username?: string): Promise<User> {
  const existing = await pool.query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const referralCode = Math.random().toString(36).substring(2, 12);
  const result = await pool.query(
    `INSERT INTO users (telegram_id, username, referral_code)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [telegramId, username, referralCode]
  );

  return result.rows[0];
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function canTransform(user: User): Promise<boolean> {
  if (user.tier === 'pro') return true;
  
  const now = new Date();
  const resetAt = new Date(user.transforms_reset_at);
  
  if (now > resetAt) {
    await pool.query(
      'UPDATE users SET transforms_today = 0, transforms_reset_at = NOW() + INTERVAL \'1 day\' WHERE id = $1',
      [user.id]
    );
    return true;
  }
  
  return user.transforms_today < 10;
}

export async function incrementTransforms(userId: number): Promise<void> {
  await pool.query(
    'UPDATE users SET transforms_today = transforms_today + 1 WHERE id = $1',
    [userId]
  );
}

export async function upgradeToPro(userId: number, days: number = 30): Promise<User> {
  const result = await pool.query(
    `UPDATE users 
     SET tier = 'pro', 
         subscription_end = NOW() + INTERVAL '${days} days',
         transforms_today = 0
     WHERE id = $1
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

export async function createDraft(
  userId: number,
  inputText: string | undefined,
  inputType: string,
  style: string,
  generatedPost: string
): Promise<Draft> {
  const result = await pool.query(
    `INSERT INTO drafts (user_id, input_text, input_type, style, generated_post)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, inputText, inputType, style, generatedPost]
  );
  return result.rows[0];
}

export async function getDraftsByUserId(userId: number): Promise<Draft[]> {
  const result = await pool.query(
    'SELECT * FROM drafts WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

export async function getDraftById(id: number, userId: number): Promise<Draft | null> {
  const result = await pool.query(
    'SELECT * FROM drafts WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0] || null;
}

export async function updateDraft(id: number, userId: number, updates: Partial<Draft>): Promise<Draft> {
  const result = await pool.query(
    `UPDATE drafts 
     SET style = COALESCE($1, style),
         generated_post = COALESCE($2, generated_post),
         is_published = COALESCE($3, is_published),
         updated_at = NOW()
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [updates.style, updates.generated_post, updates.is_published, id, userId]
  );
  return result.rows[0];
}

export async function deleteDraft(id: number, userId: number): Promise<void> {
  await pool.query(
    'DELETE FROM drafts WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}

export async function createBrandVoice(
  userId: number,
  name: string,
  tone: string | undefined,
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

export async function recordAnalytics(userId: number, generated: number, published: number): Promise<void> {
  await pool.query(
    `INSERT INTO analytics (user_id, drafts_generated, drafts_published)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, date)
     DO UPDATE SET
       drafts_generated = analytics.drafts_generated + $2,
       drafts_published = analytics.drafts_published + $3`,
    [userId, generated, published]
  );
}

export async function getAnalytics(userId: number, days: number = 7): Promise<Analytics[]> {
  const result = await pool.query(
    `SELECT * FROM analytics 
     WHERE user_id = $1 AND date >= NOW() - INTERVAL '${days} days'
     ORDER BY date DESC`,
    [userId]
  );
  return result.rows;
}

export async function createPayment(
  userId: number,
  amount: number,
  telegramPaymentId?: string
): Promise<Payment> {
  const result = await pool.query(
    `INSERT INTO payments (user_id, amount, telegram_payment_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, amount, telegramPaymentId]
  );
  return result.rows[0];
}

export async function updatePaymentStatus(id: number, status: string): Promise<Payment> {
  const result = await pool.query(
    'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

export async function incrementReferralCount(referralCode: string): Promise<void> {
  await pool.query(
    'UPDATE users SET referred_count = referred_count + 1 WHERE referral_code = $1',
    [referralCode]
  );
}
