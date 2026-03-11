import { useState, useEffect, useRef } from 'react';

export default function News() {
  const [mode, setMode] = useState('all'); // all | news | sale
  const tabsBarRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const items = [
    {
      id: 1,
      type: 'sale',
      badge: 'Акция',
      image: '/images/news-combo.jpg',
      title: 'Купи комбо x3 — получи плед в подарок',
      date: '15 декабря',
      text: 'Зима — время тёплых историй, большого экрана и особого уюта. Ember и партнёры запускают совместную акцию: покупайте комбо-сеты и получайте фирменный плед в подарок.',
    },
    {
      id: 2,
      type: 'news',
      badge: 'Новость',
      image: '/images/news-refund.jpg',
      title: 'Теперь билеты можно вернуть онлайн бонусами +10%',
      date: '03 декабря',
      text: 'Если ваши планы поменялись, вы можете оформить возврат билета в личном кабинете. Сумма вернётся на бонусный счёт с дополнительными 10% сверху.',
    },
    {
      id: 3,
      type: 'sale',
      badge: 'Акция',
      image: '/images/news-visa.jpg',
      title: 'Миксуй выходные с Ember и Visa',
      date: '01 октября',
      text: 'При покупке двух и более билетов по картам Visa в выходные дни — второй билет за наш счёт. Подробные условия акции смотрите на сайте.',
    },
  ];

  const filtered = items.filter((n) => {
    if (mode === 'all') return true;
    if (mode === 'news') return n.type === 'news';
    if (mode === 'sale') return n.type === 'sale';
    return true;
  });

  useEffect(() => {
    const update = () => {
      if (!tabsBarRef.current) return;
      const el = tabsBarRef.current.querySelector(`.home-tab[data-tab="${mode}"]`);
      if (!el) return;
      const parentRect = tabsBarRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: rect.left - parentRect.left,
        width: rect.width,
      });
    };
    update();
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(id);
  }, [mode]);

  return (
    <div className="container">
      <header className="news-page-header">
        <h1 className="news-page-title">Новости и акции</h1>
        <div className="home-tabs-bar" ref={tabsBarRef}>
          <ul className="home-tabs-list">
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${mode === 'all' ? 'active' : ''}`}
                data-tab="all"
                onClick={() => setMode('all')}
              >
                Все
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${mode === 'news' ? 'active' : ''}`}
                data-tab="news"
                onClick={() => setMode('news')}
              >
                Новости
              </button>
            </li>
            <li className="home-tab-item">
              <button
                type="button"
                className={`home-tab ${mode === 'sale' ? 'active' : ''}`}
                data-tab="sale"
                onClick={() => setMode('sale')}
              >
                Акции
              </button>
            </li>
          </ul>
          <div className="home-tabs-indicator" style={indicatorStyle} />
        </div>
      </header>

      <section className="news-page-grid">
        {filtered.map((n) => (
          <article key={n.id} className="news-card news-card-large">
            {n.image && <img src={n.image} alt={n.title} />}
            <div className="news-badge-row">
              <span className={`news-badge ${n.type === 'sale' ? 'news-badge-sale' : 'news-badge-news'}`}>
                {n.badge}
              </span>
              <span className="news-date">{n.date}</span>
            </div>
            <h2 className="news-title">{n.title}</h2>
            <p className="news-text">{n.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

