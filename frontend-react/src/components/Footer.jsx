import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col footer-brand">
          <Link to="/" className="footer-logo">
            ember<span className="footer-logo-dot">.</span>
          </Link>
          <p className="footer-tagline">
            Кино, атмосфера и уют в стиле Ember.
          </p>
        </div>
        <div className="footer-col">
          <h4>Навигация</h4>
          <Link to="/catalog">Каталог</Link>
          <Link to="/exclusive">Эксклюзив</Link>
        </div>
        <div className="footer-col">
          <h4>Помощь</h4>
          <a href="#faq">FAQ</a>
          <a href="#contacts">Контакты</a>
        </div>
        <div className="footer-col">
          <h4>Компания</h4>
          <a href="#about">О нас</a>
        </div>
        <div className="footer-col">
          <h4>Социальные сети</h4>
          <a href="#tg">Telegram</a>
          <a href="#vk">VK</a>
        </div>
      </div>
      <div className="footer-bottom">
        2026 Ember. Все права защищены.
        {' · '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">Постеры и баннеры: TMDb</a>
      </div>
    </footer>
  );
}
