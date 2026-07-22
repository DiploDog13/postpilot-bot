// backend/src/services/database.ts

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Настройка подключения к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  // Добавляем таймауты для предотвращения ошибок подключения
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Тестируем подключение
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful");
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Интерфейсы для типизации
export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  subscription: "free" | "pro";
  transform_count: number;
  transforms_today: number;
  transforms_reset_at: Date;
  tier: "free" | "pro";
  created_at: Date;
  updated_at: Date;
}

export interface Draft {
  id: number;
  user_id: number;
  content: string;
  style: string;
  status: "draft" | "published" | "archived";
  generated_post?: string;
  is_published?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BrandVoice {
  id: number;
  user_id: number;
  name: string;
  description: string;
  tone: string;
  style: string;
  examples?: string[];
  created_at: Date;
}

// Функции для работы с пользователями
export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  try {
    const query = "SELECT * FROM users WHERE telegram_id = $1";
    const result = await pool.query(query, [telegramId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error("getUserByTelegramId error:", error);
    throw error;
  }
}

export async function createUser(telegramId: number, username?: string): Promise<User> {
  try {
    const query = `
      INSERT INTO users (telegram_id, username, subscription, transform_count, transforms_today, tier)
      VALUES ($1, $2, 'free', 0, 0, 'free')
      RETURNING *
    `;
    const result = await pool.query(query, [telegramId, username]);
    return result.rows[0];
  } catch (error) {
    console.error("createUser error:", error);
    throw error;
  }
}

export async function updateUserSubscription(telegramId: number, tier: "free" | "pro"): Promise<User> {
  try {
    const query = `
      UPDATE users 
      SET subscription = $2, tier = $2, updated_at = NOW()
      WHERE telegram_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [telegramId, tier]);
    return result.rows[0];
  } catch (error) {
    console.error("updateUserSubscription error:", error);
    throw error;
  }
}

// Функции для работы с трансформациями
export async function incrementTransformCount(telegramId: number): Promise<void> {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) return;
    
    const now = new Date();
    const lastReset = new Date(user.transforms_reset_at || user.created_at);
    const isNewDay = now.getDate() !== lastReset.getDate() || 
                     now.getMonth() !== lastReset.getMonth() || 
                     now.getFullYear() !== lastReset.getFullYear();
    
    if (isNewDay) {
      const query = `
        UPDATE users 
        SET transforms_today = 1, 
            transform_count = transform_count + 1,
            transforms_reset_at = NOW()
        WHERE telegram_id = $1
      `;
      await pool.query(query, [telegramId]);
    } else {
      const query = `
        UPDATE users 
        SET transforms_today = transforms_today + 1,
            transform_count = transform_count + 1
        WHERE telegram_id = $1
      `;
      await pool.query(query, [telegramId]);
    }
  } catch (error) {
    console.error("incrementTransformCount error:", error);
    throw error;
  }
}

export async function getTransformCount(telegramId: number): Promise<number> {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) return 0;
    
    const now = new Date();
    const lastReset = new Date(user.transforms_reset_at || user.created_at);
    const isNewDay = now.getDate() !== lastReset.getDate() || 
                     now.getMonth() !== lastReset.getMonth() || 
                     now.getFullYear() !== lastReset.getFullYear();
    
    if (isNewDay) {
      return 0;
    }
    
    return user.transforms_today || 0;
  } catch (error) {
    console.error("getTransformCount error:", error);
    throw error;
  }
}

// Функции для работы с черновиками
export async function saveDraft(draft: Omit<Draft, "id" | "created_at" | "updated_at">): Promise<Draft> {
  try {
    const query = `
      INSERT INTO drafts (user_id, content, style, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [
      draft.user_id,
      draft.content,
      draft.style,
      draft.status
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("saveDraft error:", error);
    throw error;
  }
}

export async function updateDraft(id: number, data: Partial<Draft>): Promise<Draft> {
  try {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    if (fields.length === 0) {
      throw new Error("No fields to update");
    }
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ");
    const query = `
      UPDATE drafts 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0];
  } catch (error) {
    console.error("updateDraft error:", error);
    throw error;
  }
}

export async function getDraftsByUser(userId: number): Promise<Draft[]> {
  try {
    const query = `
      SELECT * FROM drafts 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error("getDraftsByUser error:", error);
    throw error;
  }
}

export async function getDraftById(id: number): Promise<Draft | null> {
  try {
    const query = "SELECT * FROM drafts WHERE id = $1";
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error("getDraftById error:", error);
    throw error;
  }
}

export async function deleteDraft(id: number): Promise<void> {
  try {
    const query = "DELETE FROM drafts WHERE id = $1";
    await pool.query(query, [id]);
  } catch (error) {
    console.error("deleteDraft error:", error);
    throw error;
  }
}

// Функции для работы с Brand Voice
export async function getBrandVoicesByUser(userId: number): Promise<BrandVoice[]> {
  try {
    const query = "SELECT * FROM brand_voices WHERE user_id = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error("getBrandVoicesByUser error:", error);
    throw error;
  }
}

export async function createBrandVoice(voice: Omit<BrandVoice, "id" | "created_at">): Promise<BrandVoice> {
  try {
    const query = `
      INSERT INTO brand_voices (user_id, name, description, tone, style, examples)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      voice.user_id,
      voice.name,
      voice.description,
      voice.tone,
      voice.style,
      voice.examples || []
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("createBrandVoice error:", error);
    throw error;
  }
}

// Функция для инициализации базы данных
export async function initializeDatabase() {
  try {
    // Сначала проверяем подключение
    const connected = await testConnection();
    if (!connected) {
      console.error("❌ Cannot initialize database - connection failed");
      throw new Error("Database connection failed");
    }

    const queries = [
      // Таблица пользователей
      `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        subscription VARCHAR(50) DEFAULT 'free',
        transform_count INTEGER DEFAULT 0,
        transforms_today INTEGER DEFAULT 0,
        transforms_reset_at TIMESTAMP DEFAULT NOW(),
        tier VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
      `,
      // Таблица черновиков
      `
      CREATE TABLE IF NOT EXISTS drafts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        style VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        generated_post TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
      `,
      // Таблица Brand Voice
      `
      CREATE TABLE IF NOT EXISTS brand_voices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tone VARCHAR(100),
        style VARCHAR(100),
        examples TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      )
      `,
      // Таблица аналитики
      `
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
      `,
      // Таблица платежей
      `
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        currency VARCHAR(10) DEFAULT 'XTR',
        status VARCHAR(50) DEFAULT 'pending',
        payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
      `
    ];
    
    for (const query of queries) {
      await pool.query(query);
    }
    
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

export default {
  pool,
  testConnection,
  getUserByTelegramId,
  createUser,
  updateUserSubscription,
  incrementTransformCount,
  getTransformCount,
  saveDraft,
  updateDraft,
  getDraftsByUser,
  getDraftById,
  deleteDraft,
  getBrandVoicesByUser,
  createBrandVoice,
  initializeDatabase,
};
