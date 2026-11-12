# GymBook — статический сайт на nginx.
# Railway/любой Docker-хостинг передаёт порт через переменную PORT (по умолчанию 8080).
FROM nginx:1.27-alpine

ENV PORT=8080

# Официальный entrypoint nginx подставляет переменные окружения
# в шаблоны из /etc/nginx/templates и кладёт результат в /etc/nginx/conf.d.
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY public/ /usr/share/nginx/html/

RUN rm -f /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

STOPSIGNAL SIGQUIT
