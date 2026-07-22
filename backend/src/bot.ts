// backend/src/bot.ts - фрагмент с исправленным вызовом платежей

// В обработчике callback_query, в разделе "Покупка Pro" (примерно строка 390)
if (data === "buy_pro") {
  try {
    // Отправляем платежный запрос через Telegram Stars
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.answerCallbackQuery("❌ Ошибка: не найден чат");
      return;
    }

    // Используем исправленную функцию sendPaymentInvoice
    const result = await sendPaymentInvoice(
      ctx,
      chatId,
      "⭐️ Pro Subscription",
      "Безлимитные трансформации и премиум-функции на месяц",
      "pro_subscription",
      500 // 500 Stars
    );
    
    if (result && result.ok) {
      await ctx.answerCallbackQuery("💰 Открываю платежное окно...");
    } else {
      await ctx.answerCallbackQuery("❌ Ошибка при открытии платежа");
    }
  } catch (error) {
    console.error("Pro upgrade error:", error);
    await ctx.answerCallbackQuery("❌ Ошибка при оформлении подписки");
  }
  return;
}
