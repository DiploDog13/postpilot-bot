const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    validate: (initData: string) => apiRequest('/api/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  },
  user: {
    get: () => apiRequest('/api/user'),
  },
  drafts: {
    getAll: () => apiRequest('/api/drafts'),
    get: (id: number) => apiRequest(`/api/drafts/${id}`),
    create: (data: any) => apiRequest('/api/drafts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: any) => apiRequest(`/api/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => apiRequest(`/api/drafts/${id}`, {
      method: 'DELETE',
    }),
  },
  generate: {
    post: (data: any) => apiRequest('/api/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  brandVoices: {
    getAll: () => apiRequest('/api/brand-voices'),
    create: (data: any) => apiRequest('/api/brand-voices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  analytics: {
    get: (days?: number) => apiRequest(`/api/analytics${days ? `?days=${days}` : ''}`),
  },
  upgrade: {
    pro: () => apiRequest('/api/upgrade', {
      method: 'POST',
    }),
  },
};
