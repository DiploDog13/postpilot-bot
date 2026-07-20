import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface Draft {
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

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const data = await api.drafts.getAll();
      setDrafts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const createDraft = async (data: any) => {
    try {
      const newDraft = await api.drafts.create(data);
      setDrafts([newDraft, ...drafts]);
      return newDraft;
    } catch (err) {
      throw err;
    }
  };

  const updateDraft = async (id: number, data: any) => {
    try {
      const updated = await api.drafts.update(id, data);
      setDrafts(drafts.map(d => d.id === id ? updated : d));
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteDraft = async (id: number) => {
    try {
      await api.drafts.delete(id);
      setDrafts(drafts.filter(d => d.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    drafts,
    loading,
    error,
    fetchDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
  };
}
