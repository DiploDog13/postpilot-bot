import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface User {
  id: number;
  telegram_id: number;
  username?: string;
  tier: 'free' | 'pro';
  subscription_end?: string;
  transforms_today: number;
  transforms_reset_at: string;
  referred_count: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (!tg) {
          throw new Error('Telegram WebApp not available');
        }

        const initData = tg.initData;
        if (!initData) {
          throw new Error('No init data available');
        }

        const response = await api.auth.validate(initData);
        localStorage.setItem('token', response.token);
        setUser(response.user);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth failed');
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const userData = await api.user.get();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return { user, loading, error, refreshUser };
}
