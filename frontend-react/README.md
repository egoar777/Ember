# КиноВселенная — React фронтенд

Фронтенд на React (Vite) + React Router. Тот же дизайн и API, что и в HTML/CSS/JS версии.

## Запуск

```bash
npm install
npm run dev
```

Откроется http://localhost:5173. Бэкенд должен быть запущен на http://localhost:5000.

## Переменные окружения

- `VITE_API_URL` — базовый URL API (по умолчанию `http://localhost:5000/api`)

## Структура

- `src/api/client.js` — HTTP-клиент с JWT и refresh
- `src/context/` — AuthContext, ToastContext, VoiceContext
- `src/components/` — Header, Footer, Layout, MovieCard, VoiceOverlay
- `src/pages/` — Home, Catalog, Movie, Booking, Profile, Exclusive, Auth
