# Деплой GymBook

Приложение — чистая статика: HTML, JS, PWA-манифест, service worker, иконки и шрифты.
Бэкенд, база данных и переменные окружения не нужны. Данные пользователя остаются в его браузере.

Ограничения, которые важно соблюдать на любом хостинге:

- HTTPS обязателен для service worker и установки PWA (localhost — исключение).
- `public/` — корень сайта. `index.html` должен открываться по `/`.
- `sw.js` и `index.html` нельзя кэшировать надолго, иначе обновления не доедут.
- SPA-fallback: неизвестные пути отдают `index.html` (в nginx уже настроено).

---

## 1. Railway (рекомендуется)

Уже установлен Railway CLI 5.71 и есть вход в аккаунт.

```powershell
cd C:\Users\tukha\gymbook
railway login                      # если ещё не вошли
railway up -y --name gymbook       # создать проект и задеплоить Dockerfile
railway domain                     # выдать публичный https://…up.railway.app
railway logs                       # логи nginx
```

Если папка уже привязана к другому проекту, добавьте `--new`:

```powershell
railway up -y --new --name gymbook
```

Что происходит: Railway собирает `Dockerfile` (nginx:1.27-alpine), передаёт порт через
`PORT` (по умолчанию 8080), проверяет `/healthz` и раздаёт содержимое `public/`.
Конфиг Railway — `railway.toml` (healthcheck, рестарт при падении).

Обновление после правок:

```powershell
railway up -y
```

Откат: Railway → Deployments → выбрать предыдущий деплой → Redeploy.

Переменные: ничего задавать не нужно. При желании `PORT` можно переопределить в Railway,
nginx подхватит его автоматически.

---

## 2. Docker / VPS

```powershell
cd C:\Users\tukha\gymbook
docker build -t gymbook .
docker run --rm -p 8080:8080 gymbook
# http://localhost:8080
```

На сервере с nginx и HTTPS:

```bash
# 1. скопировать public/ на сервер
rsync -az --delete public/ user@server:/var/www/gymbook/

# 2. /etc/nginx/sites-available/gymbook
server {
    listen 80;
    server_name gymbook.example.com;
    root /var/www/gymbook;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location = /sw.js { add_header Cache-Control "no-cache"; }
}

# 3. включить сайт и выпустить сертификат
ln -s /etc/nginx/sites-available/gymbook /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d gymbook.example.com
```

Полный набор заголовков безопасности и правил кэширования — в
`deploy/default.conf.template` (тот же конфиг использует Docker-образ).

---

## 3. Netlify (drag & drop, без CLI)

1. Откройте https://app.netlify.com/drop
2. Перетащите папку `public` целиком.
3. Получите HTTPS-адрес вида `https://gymbook-xxxx.netlify.app`.

Либо из терминала:

```powershell
npx netlify-cli deploy --prod --dir=public
```

`netlify.toml` уже указывает `publish = "public"`, а `public/_headers` задаёт CSP и кэш.

---

## 4. Cloudflare Pages

1. Dash → Workers & Pages → Create → Pages → Upload assets.
2. Папка — `public`, build command — пусто, output directory — `public`.
3. После публикации откройте `https://<project>.pages.dev`.

Если подключаете Git-репозиторий: framework preset — None, build command — пусто,
output directory — `public`.

---

## 5. GitHub Pages

Сайт публикуется из ветки `gh-pages`: в ней лежит содержимое `public/` в корне.
Actions не используются, поэтому токену не нужен scope `workflow`.

```powershell
cd C:\Users\tukha\gymbook
gh auth login                                  # один раз
gh repo create gymbook --public --source . --remote origin
git push -u origin main                        # исходники
npm run deploy                                 # public/ → ветка gh-pages
```

Включить Pages (один раз):

```powershell
'{"source":{"branch":"gh-pages","path":"/"}}' | Set-Content pages.json -Encoding utf8
gh api --method POST repos/tukhatukha01-lang/gymbook/pages --input pages.json
Remove-Item pages.json
```

Или в браузере: Settings → Pages → Source: **Deploy from a branch** → `gh-pages` / `/ (root)`.

Сайт: `https://<user>.github.io/gymbook/`. Обновление после правок:

```powershell
git add . && git commit -m "..." && git push
npm run deploy
```

Файл `public/.nojekyll` отключает обработку Jekyll, чтобы GitHub отдавал статику как есть.
Своих заголовков кэширования у Pages нет, `404.html` перенаправляет на главную;
PWA работает, потому что Pages отдаёт HTTPS.

---

## 6. ZIP для ручной установки

```powershell
cd C:\Users\tukha\gymbook
npm run zip
```

Получится `dist/gymbook-1.1.0.zip`: распакуйте на любом HTTPS-хостинге или откройте
`index.html` локально (без установки PWA офлайн-кэш не появится).

---

## Проверка после деплоя

1. Открыть сайт по HTTPS, в DevTools → Application:
   - Manifest без ошибок, иконки 192/512/maskable видны;
   - Service Workers → `sw.js` — **activated and is running**;
   - Cache Storage → `gymbook-shell-v1.1.0`.
2. Выключить сеть (DevTools → Network → Offline) и перезагрузить страницу — приложение
   должно открыться, данные остаться.
3. Пройти сценарий: анкета → программа → тренировка → «Выполнено» → «Завершить» →
   питание → вес → настройки → «Сохранить данные в файл» → импорт файла.
4. Проверить `https://<домен>/healthz` — ответ `ok` (для Railway/Docker).
5. Проверить заголовки: `curl -I https://<домен>/` — должны быть CSP, `X-Content-Type-Options`,
   `Referrer-Policy`.

## Новая версия и кэш

После изменений:

1. Поднимите `version` в `package.json` и `VERSION` в `public/sw.js`.
2. `npm run check` — проверка совпадения версий и целостности файлов.
3. Задеплойте. Пользователи со старой версией увидят баннер «Доступна новая версия» →
   «Обновить» (service worker скачает новый кэш и перезагрузит страницу).

## Частые проблемы

| Симптом | Причина | Решение |
|---|---|---|
| Не появляется «Установить приложение» | нет HTTPS или не выполнен критерий installability | HTTPS, `manifest` + `sw.js` + иконки 192/512 |
| После деплоя старая версия | закэширован `index.html` или `sw.js` | проверьте `Cache-Control: no-cache` для них |
| Белый экран после обновления | старый SW отдал старый index | поднимите `VERSION` в `sw.js`, очистите кэш |
| 502 на Railway | приложение не слушает `PORT` | контейнер слушает `${PORT}`, проверьте `/healthz` |
| Данные пропали | очистка данных сайта/браузера | резервная копия JSON из настроек |
