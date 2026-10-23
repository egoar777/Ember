# Ember — интерфейс

React-приложение кинотеатра Ember. Инструкция по настройке backend, OAuth и запуску находится в [README проекта](../README.md).

```bash
npm ci
cp .env.example .env
npm run dev
```

```bash
npm run lint -- --max-warnings 0
npm test
npm run build
```

`VITE_API_URL` — адрес API, `VITE_GOOGLE_CLIENT_ID` — публичный Client ID для входа через Google. Серверные секреты в frontend не используются.
