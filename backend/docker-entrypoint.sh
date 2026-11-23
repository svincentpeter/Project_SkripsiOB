#!/usr/bin/env sh
set -e

mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs bootstrap/cache
php artisan storage:link >/dev/null 2>&1 || true

if [ "${RUN_MIGRATIONS_ON_BOOT:-true}" = "true" ]; then
  php artisan config:clear
  php artisan migrate --force
fi

php artisan config:cache
php artisan route:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
