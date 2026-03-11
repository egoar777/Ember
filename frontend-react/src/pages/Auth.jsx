import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { IconClapperboard } from '../components/Icons';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('return') || '/';
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const { show: showToast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const authTabsRef = useRef(null);
  const [authIndicatorStyle, setAuthIndicatorStyle] = useState({ left: 0, width: 0 });

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

  if (isAuthenticated) {
    navigate(returnUrl);
    return null;
  }

  const handleLoginAsAdmin = async () => {
    setLoading(true);
    try {
      await login('admin@cinema.ru', 'admin123');
      navigate(returnUrl);
    } catch (err) {
      showToast(err.message || 'Ошибка входа', 'error');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      if (!email || !password) { showToast('Заполните поля', 'error'); return; }
      setLoading(true);
      try {
        await login(email, password);
        navigate(returnUrl);
      } catch (err) {
        showToast(err.message || 'Ошибка входа', 'error');
      }
      setLoading(false);
    } else {
      if (!email || !password || !displayName) { showToast('Заполните все поля', 'error'); return; }
      if (password !== confirmPassword) { showToast('Пароли не совпадают', 'error'); return; }
      setLoading(true);
      try {
        await register(email, password, displayName);
        navigate(returnUrl);
      } catch (err) {
        showToast(err.message || 'Ошибка регистрации', 'error');
      }
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-glow" />
      <header className="header" style={{ justifyContent: 'center' }}>
        <Link to="/" className="logo">
          Ember<span style={{ color: 'var(--color-primary)' }}>.</span>
        </Link>
      </header>
      <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <h2>Добро пожаловать</h2>
        <p className="subtitle">{isLogin ? 'Войдите в аккаунт' : 'Создайте аккаунт'}</p>
        <div className="tabs-bar-wrap" ref={authTabsRef} style={{ marginBottom: 24 }}>
          <div className="tabs">
            <button type="button" className={`tab ${isLogin ? 'active' : ''}`} data-tab="login" onClick={() => setIsLogin(true)}>Вход</button>
            <button type="button" className={`tab ${!isLogin ? 'active' : ''}`} data-tab="register" onClick={() => setIsLogin(false)}>Регистрация</button>
          </div>
          <div className="home-tabs-indicator" style={authIndicatorStyle} />
        </div>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Имя</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label>Повторите пароль</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
        {isLogin && (
          <>
            <p style={{ marginTop: 16, textAlign: 'center' }}>
              <a href="#forgot" style={{ fontSize: '0.85rem' }}>Забыли пароль?</a>
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 12 }}
              disabled={loading}
              onClick={handleLoginAsAdmin}
            >
              Войти как админ
            </button>
          </>
        )}
      </div>
      </div>
    </>
  );
}
