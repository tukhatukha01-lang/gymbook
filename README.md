# GymBook 1.1 — готово к деплою

Офлайн-дневник тренировок и питания: один HTML-файл с приложением, PWA-манифест,
service worker и локальные шрифты. Никакого бэкенда и сборки — только статика.

## Что внутри

```
gymbook/
├─ public/                  # всё, что отдаётся браузеру (корень сайта)
│  ├─ index.html            # само приложение (HTML + CSS + JS)
│  ├─ manifest.webmanifest  # PWA-манифест
│  ├─ sw.js                 # service worker: офлайн + обновления
│  ├─ offline.html          # заглушка, если сети нет и кэш пуст
│  ├─ 404.html              # редирект на главную
│  ├─ icons/                # иконки 192/512/maskable
│  └─ fonts/                # Manrope 500–800 (woff2, локально)
├─ deploy/default.conf.template  # конфиг nginx (порт, кэш, CSP)
├─ Dockerfile               # образ nginx для Railway/любого Docker-хостинга
├─ railway.toml             # healthcheck и рестарт-политика Railway
├─ scripts/serve.js         # локальный сервер без зависимостей
├─ scripts/check.js         # статическая проверка сборки
└─ scripts/make-zip.ps1     # сборка zip для ручной установки
```

## Локальный запуск

```powershell
cd C:\Users\tukha\gymbook
npm start            # http://localhost:4173
npm run check        # 50+ проверок: файлы, манифест, SW, синтаксис JS
npm run zip          # dist/gymbook-1.1.0.zip
```

Node.js 18+ (уже установлен). Внешние пакеты не нужны.

## Что улучшено в 1.1

- **Полный офлайн**: шрифты Manrope лежат в `public/fonts`, приложение не ходит в Google Fonts.
- **PWA**: корректные `start_url`/`scope`, maskable-иконка, ярлыки «Тренировка», «Питание», «Прогресс».
- **Service worker**: версионированный кэш, network-first для страниц, stale-while-revalidate для файлов,
  удаление старых кэшей, fallback на кэш при 4xx/5xx (не только при обрыве сети).
- **Обновления без сюрпризов**: баннер «Доступна новая версия» → кнопка «Обновить».
- **Установка из приложения**: кнопка «📲 Установить приложение» в настройках (Chrome/Edge/Android).
- **Deep links**: `/#work`, `/#food`, `/#stat` открывают нужный раздел (работает в ярлыках PWA).
- **Данные**: `navigator.storage.persist()` — браузер реже удаляет хранилище; напоминание о бэкапе в настройках.
- **Безопасность**: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, COOP; `server_tokens off`.
- **Кэширование**: `index.html`, `sw.js`, `manifest.webmanifest` — без кэша, иконки и шрифты — надолго.
- **Доступность**: Lighthouse 100/100/100 (accessibility, best practices, SEO), контраст текста исправлен.
- **Устойчивость**: SPA-fallback, `/healthz` для healthcheck, аккуратные 404 и offline-страницы.

## Данные и приватность

Всё хранится в `localStorage` браузера (`gymbook.v1`), на сервер ничего не уходит.
Сервер отдаёт только статические файлы и не видит тренировки. Резервная копия — JSON-файл
из настроек; её можно импортировать обратно.

## Деплой

- [DEPLOY.md](DEPLOY.md) — Railway, Docker, Netlify, Cloudflare Pages, GitHub Pages, VPS.
- Быстро: `railway init`, затем `railway up` в этой папке (подробности в DEPLOY.md).

## Версия

`1.1.0`. При изменении `public/sw.js` или списка файлов поднимайте `VERSION` в `sw.js`
и `version` в `package.json` — `npm run check` следит за совпадением.
