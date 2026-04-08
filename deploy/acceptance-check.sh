#!/usr/bin/env bash
set -euo pipefail

APP_HOST="${1:-127.0.0.1}"
APP_PORT="${2:-3010}"

echo "== notamax acceptance check =="
echo "host: ${APP_HOST}"
echo "port: ${APP_PORT}"

echo
echo "[1/5] systemd service"
if systemctl is-active --quiet notamax; then
  echo "OK: notamax active"
else
  echo "FAIL: notamax inactive" >&2
  sudo systemctl status notamax --no-pager || true
  exit 1
fi

echo
echo "[2/5] local backend response"
if curl -fsS "http://127.0.0.1:${APP_PORT}/" >/dev/null; then
  echo "OK: backend responds on 127.0.0.1:${APP_PORT}"
else
  echo "FAIL: backend does not respond on 127.0.0.1:${APP_PORT}" >&2
  exit 1
fi

echo
echo "[3/5] nginx config"
sudo nginx -t >/dev/null
echo "OK: nginx config valid"

echo
echo "[4/5] tls endpoint (if enabled)"
if curl -fsSI "https://${APP_HOST}/" >/dev/null 2>&1; then
  echo "OK: https://${APP_HOST}/ reachable"
else
  echo "WARN: https://${APP_HOST}/ is not reachable (skip if using quick tunnel only)"
fi

echo
echo "[5/5] firewall quick view"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw status | sed -n '1,20p'
else
  echo "INFO: ufw not installed"
fi

echo
echo "Done."
