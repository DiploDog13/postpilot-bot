// backend/src/api.ts

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { verify } from "jsonwebtoken";
import { 
  getUserByTelegramId, 
  createUser, 
  saveDraft, 
  updateDraft, 
  getDraftsByUser,
  getDraftById,
  deleteDraft,
  getBrandVoicesByUser,
  createBrandVoice,
  getTransformCount,
  incrementTransformCount,
  updateUserSubscription,
  User,
  Draft,
  BrandVoice
} from "./services/database";
import { generatePost } from "./services/openai";

// Создаем экземпляр приложения Hono с типизированным контекстом
type Variables = {
  userId: number;
  telegramId: number;
};

const app = new Hono<{ Variables: Variables }>();

// Настройка CORS
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
}));

// Middleware для аутентификации
app.use("/api/*", async (c, next) => {
  // Пропускаем эндпоинты, которые не требуют аутентификации
  if (c.req.path === "/api/auth/validate") {
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verify(token, process.env.JWT_SECRET || "default_secret");
    // Используем c.set с правильными типами
    c.set("userId", (decoded as any).userId);
    c.set("telegramId", (decoded as any).telegramId);
    await next();
  } catch (error) {
    console.error("Auth error:", error);
    throw new HTTPException(401, { message: "Unauthorized: Invalid token" });
  }
});

// ==================== АУТЕНТИФИКАЦИЯ ====================

// Валидация Telegram init data
app.post("/api/auth/validate", async (c) => {
  try {
    const body = await c.req.json();
    const { initData, userId, username } = body;

    if (!initData && !userId) {
      return c.json({ error: "Missing initData or userId" }, 400);
    }

    // Если передан userId, проверяем или создаем пользователя
    if (userId) {
      let user = await getUserByTelegramId(parseInt(userId));
      if (!user) {
        user = await createUser(parseInt(userId), username);
      }
      return c.json({
        success: true,
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          subscription: user.subscription,
          tier: user.tier,
          transform_count: user.transform_count,
          transforms_today: user.transforms_today,
        }
      });
    }

    // Здесь должна быть валидация Telegram init data
    // В реальном проекте используйте:
    // const isValid = validateTelegramInitData(initData);
    // if (!isValid) return c.json({ error: "Invalid init data" }, 401);

    return c.json({ success: true, message: "Validation successful" });
  } catch (error) {
    console.error("Auth validate error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// ==================== ПОЛЬЗОВАТЕЛИ ====================

// Получение информации о текущем пользователе
app.get("/api/user", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const user = await getUserByTelegramId(userId);
    if (!user) {
      throw new HTTPException(404, { message: "User not found" });
    }

    return c.json({
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      subscription: user.subscription,
      tier: user.tier,
      transform_count: user.transform_count,
      transforms_today: user.transforms_today,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error("Get user error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to get user" }, 500);
  }
});

// Обновление подписки пользователя
app.post("/api/user/upgrade", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await c.req.json();
    const { tier } = body;

    if (!tier || !["free", "pro"].includes(tier)) {
      return c.json({ error: "Invalid tier. Must be 'free' or 'pro'" }, 400);
    }

    const user = await updateUserSubscription(userId, tier);
    return c.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        subscription: user.subscription,
        tier: user.tier,
      }
    });
  } catch (error) {
    console.error("Upgrade user error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to upgrade user" }, 500);
  }
});

// ==================== ЧЕРНОВИКИ ====================

// Получение всех черновиков пользователя
app.get("/api/drafts", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const drafts = await getDraftsByUser(userId);
    const paginatedDrafts = drafts.slice(offset, offset + limit);

    return c.json({
      drafts: paginatedDrafts,
      total: drafts.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get drafts error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to get drafts" }, 500);
  }
});

// Получение одного черновика по ID
app.get("/api/drafts/:id", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: "Invalid draft ID" }, 400);
    }

    const draft = await getDraftById(id);
    if (!draft) {
      throw new HTTPException(404, { message: "Draft not found" });
    }

    // Проверяем, что черновик принадлежит пользователю
    if (draft.user_id !== userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    return c.json(draft);
  } catch (error) {
    console.error("Get draft error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to get draft" }, 500);
  }
});

// Создание нового черновика
app.post("/api/drafts", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await c.req.json();
    const { content, style, status } = body;

    if (!content) {
      return c.json({ error: "Content is required" }, 400);
    }

    // Проверяем лимиты
    const count = await getTransformCount(userId);
    const user = await getUserByTelegramId(userId);
    if (count >= 10 && user?.subscription !== "pro") {
      return c.json({ 
        error: "Daily limit reached. Upgrade to Pro for unlimited access.",
        limitReached: true 
      }, 403);
    }

    const draftData: Omit<Draft, "id" | "created_at" | "updated_at"> = {
      user_id: userId,
      content: content,
      style: style || "auto",
      status: (status as "draft" | "published" | "archived") || "draft",
    };

    const draft = await saveDraft(draftData);
    
    // Инкрементируем счетчик трансформаций
    await incrementTransformCount(userId);

    return c.json({
      success: true,
      draft,
      remaining: 10 - (await getTransformCount(userId)),
    });
  } catch (error) {
    console.error("Create draft error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to create draft" }, 500);
  }
});

// Обновление черновика
app.put("/api/drafts/:id", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: "Invalid draft ID" }, 400);
    }

    // Проверяем существование черновика
    const existingDraft = await getDraftById(id);
    if (!existingDraft) {
      throw new HTTPException(404, { message: "Draft not found" });
    }

    // Проверяем права доступа
    if (existingDraft.user_id !== userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const body = await c.req.json();
    const { content, style, status, is_published } = body;

    const updateData: Partial<Draft> = {};
    if (content !== undefined) updateData.content = content;
    if (style !== undefined) updateData.style = style;
    if (status !== undefined) updateData.status = status;
    if (is_published !== undefined) updateData.is_published = is_published;

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    const updatedDraft = await updateDraft(id, updateData);
    return c.json({
      success: true,
      draft: updatedDraft,
    });
  } catch (error) {
    console.error("Update draft error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to update draft" }, 500);
  }
});

// Удаление черновика
app.delete("/api/drafts/:id", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: "Invalid draft ID" }, 400);
    }

    // Проверяем существование черновика
    const existingDraft = await getDraftById(id);
    if (!existingDraft) {
      throw new HTTPException(404, { message: "Draft not found" });
    }

    // Проверяем права доступа
    if (existingDraft.user_id !== userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    await deleteDraft(id);
    return c.json({
      success: true,
      message: "Draft deleted successfully",
    });
  } catch (error) {
    console.error("Delete draft error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to delete draft" }, 500);
  }
});

// ==================== ГЕНЕРАЦИЯ ПОСТОВ ====================

// Генерация поста из текста
app.post("/api/generate", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await c.req.json();
    const { text, style, tone } = body;

    if (!text) {
      return c.json({ error: "Text is required" }, 400);
    }

    // Проверяем лимиты
    const count = await getTransformCount(userId);
    const user = await getUserByTelegramId(userId);
    if (count >= 10 && user?.subscription !== "pro") {
      return c.json({ 
        error: "Daily limit reached. Upgrade to Pro for unlimited access.",
        limitReached: true,
        remaining: 0
      }, 403);
    }

    // Генерируем пост
    const generatedPost = await generatePost(text, style || "auto", tone);
    
    // Инкрементируем счетчик трансформаций
    await incrementTransformCount(userId);
    
    const remaining = 10 - (await getTransformCount(userId));

    return c.json({
      success: true,
      generatedPost,
      remaining,
      isPro: user?.subscription === "pro",
    });
  } catch (error) {
    console.error("Generate post error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to generate post" }, 500);
  }
});

// ==================== BRAND VOICE ====================

// Получение всех Brand Voices пользователя
app.get("/api/brand-voices", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const voices = await getBrandVoicesByUser(userId);
    
    return c.json({
      success: true,
      voices: voices,
    });
  } catch (error) {
    console.error("Get brand voices error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to get brand voices" }, 500);
  }
});

// Создание нового Brand Voice
app.post("/api/brand-voices", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await c.req.json();
    const { name, description, tone, style, examples } = body;

    if (!name || !description) {
      return c.json({ error: "Name and description are required" }, 400);
    }

    const voiceData: Omit<BrandVoice, "id" | "created_at"> = {
      user_id: userId,
      name: name,
      description: description,
      tone: tone || "professional",
      style: style || "balanced",
      examples: examples || [],
    };

    const voice = await createBrandVoice(voiceData);
    return c.json({
      success: true,
      voice,
    });
  } catch (error) {
    console.error("Create brand voice error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to create brand voice" }, 500);
  }
});

// ==================== АНАЛИТИКА ====================

// Получение аналитики пользователя
app.get("/api/analytics", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const user = await getUserByTelegramId(userId);
    if (!user) {
      throw new HTTPException(404, { message: "User not found" });
    }

    const drafts = await getDraftsByUser(userId);
    const published = drafts.filter(d => d.status === "published");
    const archived = drafts.filter(d => d.status === "archived");

    return c.json({
      success: true,
      analytics: {
        total_transforms: user.transform_count || 0,
        transforms_today: user.transforms_today || 0,
        max_daily_limit: user.subscription === "pro" ? "unlimited" : 10,
        total_drafts: drafts.length,
        published_drafts: published.length,
        archived_drafts: archived.length,
        subscription: user.subscription,
        tier: user.tier,
        member_since: user.created_at,
      }
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to get analytics" }, 500);
  }
});

// ==================== ПЛАТЕЖИ ====================

// Инициация апгрейда на Pro
app.post("/api/upgrade", async (c) => {
  try {
    const userId = c.get("userId");
    if (!userId) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const body = await c.req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return c.json({ error: "Payment ID is required" }, 400);
    }

    // Здесь должна быть логика проверки платежа через Telegram Stars
    // В реальном проекте нужно проверить статус платежа

    // Обновляем подписку пользователя
    const user = await updateUserSubscription(userId, "pro");

    return c.json({
      success: true,
      message: "Successfully upgraded to Pro!",
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        subscription: user.subscription,
        tier: user.tier,
      }
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    if (error instanceof HTTPException) throw error;
    return c.json({ error: "Failed to upgrade" }, 500);
  }
});

// ==================== HEALTH CHECK ====================

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.get("/", (c) => {
  return c.json({
    name: "PostPilot Bot API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      auth: "/api/auth/validate",
      user: "/api/user",
      drafts: "/api/drafts",
      generate: "/api/generate",
      brandVoices: "/api/brand-voices",
      analytics: "/api/analytics",
      upgrade: "/api/upgrade",
      health: "/health",
    }
  });
});

// Обработка ошибок
app.onError((err, c) => {
  console.error("API Error:", err);
  
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      status: err.status,
    }, err.status);
  }

  return c.json({
    error: "Internal server error",
    message: err.message || "Unknown error",
  }, 500);
});

// Экспортируем приложение
export default app;
