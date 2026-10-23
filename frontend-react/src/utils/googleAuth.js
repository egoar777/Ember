const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
const STATE_KEY = 'ember_google_state';

export function safeReturnPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : '/';
}

export function consumeGoogleAuthState(state) {
  const raw = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  const saved = raw ? JSON.parse(raw) : null;
  if (!saved || !state || state !== saved.nonce || Date.now() - saved.createdAt > 10 * 60 * 1000) {
    throw new Error('Invalid Google OAuth state');
  }
  return safeReturnPath(saved.returnPath);
}

export function getGoogleRedirectUri() {
  return `${window.location.origin}/auth`;
}

export function isGoogleAuthConfigured() {
  return Boolean(GOOGLE_CLIENT_ID);
}

export function buildGoogleAuthUrl(returnPath = '/') {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
  }

  const redirectUri = getGoogleRedirectUri();
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, JSON.stringify({ nonce: state, returnPath: safeReturnPath(returnPath), createdAt: Date.now() }));
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function startGoogleSignIn(returnPath = '/') {
  window.location.href = buildGoogleAuthUrl(returnPath);
}
