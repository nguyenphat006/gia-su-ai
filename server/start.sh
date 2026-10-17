#!/usr/bin/env bash
# Khởi động trên Render (gói free: 1 container). Celery worker + beat chạy nền cùng container với web.
# Khi nâng gói, tách worker thành Background Worker riêng và đặt RUN_CELERY_IN_WEB=false.
set -euo pipefail

python manage.py bootstrap   # migrate + seed_core (idempotent, không ghi đè dữ liệu đã chỉnh)

if [ "${RUN_CELERY_IN_WEB:-true}" = "true" ]; then
  celery -A config worker -B --loglevel=info --concurrency=1 --max-tasks-per-child=50 &
fi

exec gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" --workers "${GUNICORN_WORKERS:-2}" --timeout 120 \
  --access-logfile - --error-logfile -
