import { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/useToast';
import { useI18n } from '../context/useI18n';
import { resolveApiErrorFromException } from '../utils/resolveApiError';
import { consumeGoogleAuthState, safeReturnPath, getGoogleRedirectUri, isGoogleAuthConfigured, startGoogleSignIn } from '../utils/googleAuth';
import EmberLogo from '../components/EmberLogo';
import LoadingState from '../components/LoadingState';

function hasGoogleAuthCode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('code');
}

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const returnUrl = safeReturnPath(searchParams.get('return'));
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, isAuthenticated } = useAuth();
  const { show: showToast } = useToast();
  const { t } = useI18n();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleAuthActive, setGoogleAuthActive] = useState(hasGoogleAuthCode);
  const authTabsRef = useRef(null);
  const googleCallbackHandled = useRef(false);
  const [authIndicatorStyle, setAuthIndicatorStyle] = useState({ left: 0, width: 0 });
  const googleEnabled = isGoogleAuthConfigured();

  useEffect(() => {
    const update = () => {
      if (!authTabsRef.current) return;
      const activeTab = isLogin ? 'login' : 'register';
      const el = authTabsRef.current.querySelector(`.tab[data-tab="${activeTab}"]`);
      if (!el) return;
      const parentRect = authTabsRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setAuthIndicatorStyle({ left: rect.left - parentRect.left, width: rect.width });
    };
    update();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(id);
  }, [isLogin]);

  useEffect(() => {
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');
    if (oauthError) {
      showToast(t('auth.googleCancelled'), 'error');
      setSearchParams({}, { replace: true });
      return;
    }
    if (!code || googleCallbackHandled.current) return;

    googleCallbackHandled.current = true;
    let destination;
    try {
      destination = consumeGoogleAuthState(searchParams.get('state'));
    } catch {
      showToast(t('auth.googleError'), 'error');
      setSearchParams({}, { replace: true });
      return;
    }
    loginWithGoogle(code, getGoogleRedirectUri())
      .then(() => {
        setSearchParams({}, { replace: true });
        navigate(destination, { replace: true });
      })
      .catch((err) => {
        googleCallbackHandled.current = false;
        setGoogleAuthActive(false);
        showToast(resolveApiErrorFromException(err, t) || t('auth.googleError'), 'error');
        setSearchParams({}, { replace: true });
      })
      .finally(() => setLoading(false));
  }, [searchParams, loginWithGoogle, navigate, returnUrl, setSearchParams, showToast, t]);

  if (googleAuthActive && searchParams.has('code')) {
    return (
      <div className="auth-page auth-page--busy">
        <LoadingState label={t('auth.googleSigningIn')} fullScreen className="auth-google-loading" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to={returnUrl} replace />;

  const handleGoogleSignIn = () => {
    try {
      startGoogleSignIn(returnUrl);
    } catch {
      showToast(t('auth.googleNotConfigured'), 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      if (!email || !password) {
        showToast(t('auth.fillFields'), 'error');
        return;
      }
      setLoading(true);
      try {
        await login(email, password);
        navigate(returnUrl);
      } catch (err) {
        showToast(resolveApiErrorFromException(err, t) || t('auth.errorLogin'), 'error');
      }
      setLoading(false);
    } else {
      if (!email || !password || !displayName) {
        showToast(t('auth.fillAll'), 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast(t('auth.passwordMismatch'), 'error');
        return;
      }
      setLoading(true);
      try {
        await register(email, password, displayName);
        navigate(returnUrl);
      } catch (err) {
        showToast(resolveApiErrorFromException(err, t) || t('auth.errorRegister'), 'error');
      }
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page${isLogin ? '' : ' auth-page--register'}`}>
      <div className="bg-glow" />
      <header className="header auth-header" style={{ justifyContent: 'center' }}>
        <Link to="/" className="logo">
          <EmberLogo size="sm" />
        </Link>
      </header>
      <div className="auth-wrapper">
        <div className="glass-card auth-card">
          <h2>{t('auth.welcome')}</h2>
          <p className="subtitle">{isLogin ? t('auth.subtitleLogin') : t('auth.subtitleRegister')}</p>
          <div className="tabs-bar-wrap" ref={authTabsRef} style={{ marginBottom: 16 }}>
            <div className="tabs">
              <button type="button" className={`tab ${isLogin ? 'active' : ''}`} data-tab="login" onClick={() => setIsLogin(true)}>
                {t('auth.tabLogin')}
              </button>
              <button type="button" className={`tab ${!isLogin ? 'active' : ''}`} data-tab="register" onClick={() => setIsLogin(false)}>
                {t('auth.tabRegister')}
              </button>
            </div>
            <div className="home-tabs-indicator" style={authIndicatorStyle} />
          </div>
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>{t('profile.name')}</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label>{t('auth.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('auth.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {!isLogin && (
              <div className="form-group">
                <label>{t('auth.confirmPassword')}</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {isLogin ? t('auth.submitLogin') : t('auth.submitRegister')}
            </button>
          </form>
          {googleEnabled && (
            <>
              <div className="auth-divider">
                <span>{t('auth.or')}</span>
              </div>
              <button
                type="button"
                className="btn btn-google btn-block"
                disabled={loading}
                onClick={handleGoogleSignIn}
              >
                <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.googleLogin')}
              </button>
            </>
          )}
          {isLogin && (
            <p style={{ marginTop: 16, textAlign: 'center' }}>
              <a href="#forgot" style={{ fontSize: '0.85rem' }}>
                {t('auth.forgot')}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
