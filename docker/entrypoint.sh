#!/bin/sh
set -e

cd /var/www/html

# Let a real deployment always supply its own .env (mounted file or plain
# container env vars) — this fallback only exists so the image is runnable
# out of the box for a quick trial.
if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
fi

if [ -f .env ] && ! grep -q "^APP_KEY=base64" .env; then
    php artisan key:generate --force
fi

if [ ! -L public/storage ]; then
    php artisan storage:link || true
fi

# Storage/cache must be writable by the user Apache/PHP-FPM runs as.
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

# Opt-in only — a container starting up should never silently alter the
# database unless the deployment explicitly asks for it.
if [ "$RUN_MIGRATIONS" = "true" ]; then
    php artisan migrate --force
fi

if [ "$APP_ENV" = "production" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

exec "$@"
