const API_BASE = 'http://localhost:5000/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('jwt_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    get isAuthenticated() {
        return !!this.token;
    }

    setAuth(authResponse) {
        this.token = authResponse.token;
        this.refreshToken = authResponse.refreshToken;
        this.user = authResponse.user;
        localStorage.setItem('jwt_token', authResponse.token);
        localStorage.setItem('refresh_token', authResponse.refreshToken);
        localStorage.setItem('user', JSON.stringify(authResponse.user));
        document.dispatchEvent(new CustomEvent('authChanged', { detail: { user: this.user } }));
    }

    clearAuth() {
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        document.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null } }));
    }

    async request(path, options = {}) {
        const url = `${API_BASE}${path}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.tryRefresh();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.token}`;
                return fetch(url, { ...options, headers });
            }
            this.clearAuth();
            window.location.href = 'auth.html';
            return response;
        }
        return response;
    }

    async tryRefresh() {
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
            if (res.ok) {
                const data = await res.json();
                this.setAuth(data);
                return true;
            }
        } catch { /* ignore */ }
        return false;
    }

    async get(path) {
        const res = await this.request(path);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
        return res.json();
    }

    async post(path, body) {
        const res = await this.request(path, { method: 'POST', body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
        if (res.status === 204 || res.headers.get('content-length') === '0') return null;
        return res.json();
    }

    async put(path, body) {
        const res = await this.request(path, { method: 'PUT', body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
        return res.json();
    }

    async del(path) {
        const res = await this.request(path, { method: 'DELETE' });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
        return null;
    }

    async register(email, password, displayName) {
        const data = await this.post('/auth/register', { email, password, displayName });
        this.setAuth(data);
        return data;
    }

    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        this.setAuth(data);
        return data;
    }

    async logout() {
        try { await this.post('/auth/logout', {}); } catch { /* ignore */ }
        this.clearAuth();
    }
}

const api = new ApiClient();
