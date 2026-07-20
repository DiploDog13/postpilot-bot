import { useEffect, useState } from 'react';
import { initTelegramWebApp, closeApp, showBackButton, hideBackButton, hapticImpact, hapticNotification } from '../utils/telegram';

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const telegramWebApp = initTelegramWebApp();
    if (telegramWebApp) {
      setTg(telegramWebApp);
      setIsReady(true);
    }
  }, []);

  return {
    tg,
    isReady,
    closeApp,
    showBackButton,
    hideBackButton,
    hapticImpact,
    hapticNotification,
  };
}
