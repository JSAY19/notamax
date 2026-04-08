#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3010}"

echo "[1/3] Проверка локального backend на порту ${PORT}..."
if ! curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null; then
  echo "Ошибка: backend не отвечает на 127.0.0.1:${PORT}" >&2
  echo "Проверь: sudo systemctl status notamax --no-pager" >&2
  exit 1
fi

echo "[2/3] Проверка cloudflared..."
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared не найден. Установи его:" >&2
  echo "curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cf.deb && sudo dpkg -i /tmp/cf.deb" >&2
  exit 1
fi

echo "[3/3] Запуск quick tunnel..."
echo "Остановить: Ctrl+C"
cloudflared tunnel --url "http://127.0.0.1:${PORT}"
