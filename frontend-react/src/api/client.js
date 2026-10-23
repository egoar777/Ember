const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:5255/api';

export class ApiError extends Error {
  constructor(message, { code, params } = {}) {
    super(message || '');
    this.name = 'ApiError';
    this.code = code;
    this.params = params;
  }
}

function getStored() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    localStorage.removeItem('user');
  }
  return {
    token: localStorage.getItem('jwt_token'),
    refreshToken: localStorage.getItem('refresh_token'),
    user,
  };
}

function setStored(data) {
  if (data.token) localStorage.setItem('jwt_token', data.token);
  if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
  if (data.user != null) localStorage.setItem('user', JSON.stringify(data.user));
}

function clearStored() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

async function throwApiError(res) {
  const data = await res.json().catch(() => ({}));
  throw new ApiError(data.error || res.statusText, { code: data.code, params: data.params });
}

let refreshPromise = null;

async function refreshAccessToken(refreshToken) {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then(async (res) => {
      if (!res.ok) {
        if (res.status === 400 || res.status === 401) clearStored();
        return null;
      }
      const data = await res.json();
      setStored(data);
      return data;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function request(path, options = {}, onAuthChange) {
  const { token, refreshToken } = getStored();
  const isUpload = options.body instanceof FormData;
  const headers = { ...(isUpload ? {} : { 'Content-Type': 'application/json' }), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...options, headers });
  const isSignIn = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh'].includes(path);
  if (res.status === 401 && refreshToken && !isSignIn) {
    const data = await refreshAccessToken(refreshToken);
    if (data) {
      onAuthChange?.(data.user);
      headers.Authorization = `Bearer ${data.token}`;
      res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...options, headers });
    } else if (!getStored().token) {
      onAuthChange?.(null);
    }
  }
  return res;
}

async function readResponse(res) {
  if (!res.ok) await throwApiError(res);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiGet(path, onAuthChange) {
  return readResponse(await request(path, {}, onAuthChange));
}

export async function apiPost(path, body, onAuthChange) {
  return readResponse(await request(path, { method: 'POST', body: JSON.stringify(body) }, onAuthChange));
}

export async function apiPut(path, body, onAuthChange) {
  return readResponse(await request(path, { method: 'PUT', body: JSON.stringify(body) }, onAuthChange));
}

export async function apiDel(path, onAuthChange) {
  return readResponse(await request(path, { method: 'DELETE' }, onAuthChange));
}

export async function apiUpload(path, formData, onAuthChange) {
  return readResponse(await request(path, { method: 'POST', body: formData }, onAuthChange));
}

export function getAuth() {
  return getStored();
}

export function setAuth(data) {
  setStored(data);
}

export function clearAuth() {
  clearStored();
}
