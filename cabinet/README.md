# Remnashop Cabinet

Веб-кабинет для remnashop: Vite + React + TypeScript + Tailwind, говорит с API бота напрямую.

## Стек

- **Vite + React 18 + TypeScript** — SPA, без серверного рендеринга (не нужен за авторизацией)
- **Tailwind через CSS-переменные** — тема (`dark`/`light`/`system`) переключается заменой класса на `<html>`, без перезагрузки
- **react-router-dom** — клиентский роутинг
- **Авторизация через httpOnly cookies** (`access_token`/`refresh_token`) — так же, как сделано в backend remnashop; токены недоступны JS, авто-рефреш при 401

## Разработка

```bash
npm install
cp .env.example .env.local   # укажи VITE_TELEGRAM_BOT_USERNAME
npm run dev
```

Дев-сервер на `http://localhost:5173`, проксирует `/api/*` на `http://localhost:5000`
(порт бэкенда бота — поменяй в `vite.config.ts`, если у тебя другой).

## Сборка и деплой

### 1. Узнай имя docker-сети бота

```bash
docker network ls | grep remnashop
```

Если отличается от `remnashop_default` — поправь `networks.default.name`
в `docker-compose.cabinet.yml`.

### 2. Настрой Telegram Login Widget в @BotFather

```
/setdomain
```

Укажи домен кабинета (например `cabinet.твойдомен.com`) — без этого
Telegram Login Widget не будет работать (виджет проверяет, что встроен
именно на разрешённом домене).

### 3. Добавь домен кабинета в CORS бота

В `.env` бота (`/opt/remnashop/.env`) добавь домен кабинета в `ORIGINS`
(или как называется переменная — смотри `config.origins` в `src/web/app.py`):

```
ORIGINS=https://cabinet.твойдомен.com
```

Перезапусти бота, чтобы подхватить CORS:

```bash
docker compose restart remnashop
```

### 4. Собери и запусти кабинет

```bash
cd /opt/remnashop   # рядом с docker-compose.yml бота
# скопируй сюда папку cabinet/ из этого проекта

echo "TELEGRAM_BOT_USERNAME=your_bot_username" >> .env

docker compose -f docker-compose.yml -f docker-compose.cabinet.yml up -d --build cabinet
```

### 5. Настрой reverse proxy для домена кабинета

Кабинет слушает на `127.0.0.1:5002` внутри хоста (см. `docker-compose.cabinet.yml`).
Если у тебя Caddy — добавь блок типа:

```caddyfile
cabinet.твойдомен.com {
    reverse_proxy 127.0.0.1:5002
}
```

Если nginx — стандартный `proxy_pass http://127.0.0.1:5002;` с заголовками
`Host`, `X-Real-IP`, `X-Forwarded-Proto`.

## Структура

```
src/
  api/            — клиенты под каждый домен API (auth, subscription, referral, plans)
  components/
    ui/           — примитивы (Button, Card, Input, ThemeSwitcher, ...)
    layout/       — AppLayout (сайдбар/мобильная навигация)
  contexts/       — ThemeContext, AuthContext
  hooks/          — useSubscription
  lib/            — форматирование (трафик, даты)
  pages/          — страницы-маршруты
  types/api.ts    — точное отражение Pydantic-схем backend
```

## Известные TODO

- Лендинг с публичными тарифами (`/plans/public`) — API-клиент готов
  (`src/api/plans.ts`), страницы пока нет
- `auth_date`/`hash` в Telegram Login Widget валидируются на backend —
  фронтенд только передаёт то, что отдал виджет
