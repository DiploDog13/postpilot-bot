// backend/src/services/auth.ts

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_change_this";

export function generateToken(userId: number, telegramId: number): string {
  return jwt.sign(
    { userId, telegramId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): { userId: number; telegramId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; telegramId: number };
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export function validateTelegramInitData(initData: string): boolean {
  // Здесь должна быть валидация Telegram init data
  // В реальном проекте реализуйте проверку хэша
  return true;
}

export default {
  generateToken,
  verifyToken,
  validateTelegramInitData,
};
