const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5255/api';

function getStored() {
  return {
    token: localStorage.getItem('jwt_token'),
    refreshToken: localStorage.getItem('refresh_token'),
    user: JSON.parse(localStorage.getItem('user') || 'null'),
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

export async function request(path, options = {}, onAuthChange) {
  const { token, refreshToken } = getStored();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setStored(data);
        if (onAuthChange) onAuthChange(data.user);
        headers['Authorization'] = `Bearer ${data.token}`;
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      } else {
        clearStored();
        if (onAuthChange) onAuthChange(null);
      }
    } catch {
      clearStored();
      if (onAuthChange) onAuthChange(null);
    }
  }

  return res;
}

export async function apiGet(path, onAuthChange) {
  const res = await request(path, {}, onAuthChange);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export async function apiPost(path, body, onAuthChange) {
  const res = await request(path, { method: 'POST', body: JSON.stringify(body) }, onAuthChange);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  return res.json();
}

export async function apiPut(path, body, onAuthChange) {
  const res = await request(path, { method: 'PUT', body: JSON.stringify(body) }, onAuthChange);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export async function apiDel(path, onAuthChange) {
  const res = await request(path, { method: 'DELETE' }, onAuthChange);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return null;
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
