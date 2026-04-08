# Деплой notamax на VPS (Ubuntu)

Путь в примерах: репозиторий лежит в `/opt/notamax` (можешь заменить).

## 1. Подготовка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl
```

Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

## 2. Код на сервере

```bash
sudo mkdir -p /opt/notamax
sudo chown $USER:$USER /opt/notamax
cd /opt/notamax
git clone <URL_твоего_репозитория> .
# или scp/rsync с локальной машины
```

## 3. Сборка

```bash
cd /opt/notamax/client
npm ci
npm run build

cd /opt/notamax/server
npm ci
npm run build
```

Проверь, что есть `/opt/notamax/client/dist/index.html` и `/opt/notamax/server/dist/index.js`.

## 4. Убрать dev-зависимости после сборки (опционально)

После `npm run build` TypeScript больше не нужен в рантайме:

```bash
cd /opt/notamax/server
npm prune --omit=dev
```

## 5. Ручной запуск (проверка)

```bash
cd /opt/notamax/server
export NODE_ENV=production
export PORT=3001
node dist/index.js
```

С другой машины: `http://IP_VPS:3001` — должна открыться страница чата.  
Если firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# или пока тест без nginx:
sudo ufw allow 3001/tcp
sudo ufw enable
```

## 6. systemd (автозапуск)

```bash
sudo cp /opt/notamax/deploy/notamax.service /etc/systemd/system/
sudo nano /etc/systemd/system/notamax.service
```

Проверь `User`, `WorkingDirectory`, `PORT`. Создай пользователя без логина или используй `www-data`:

```bash
sudo useradd -r -s /usr/sbin/nologin notamax 2>/dev/null || true
sudo chown -R notamax:notamax /opt/notamax
# в notamax.service выставь User=notamax Group=notamax
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable notamax
sudo systemctl start notamax
sudo systemctl status notamax
```

## 7. Nginx + HTTPS (рекомендуется)

Socket.io нужен WebSocket / long polling — в примере уже `Upgrade` и `proxy_buffering off`.

```bash
sudo cp /opt/notamax/deploy/nginx-notamax.conf.example /etc/nginx/sites-available/notamax
sudo nano /etc/nginx/sites-available/notamax
sudo ln -s /etc/nginx/sites-available/notamax /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

С доменом и Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d твой.домен
```

Если **только IP без домена**, Let's Encrypt обычно не выдаст сертификат — тогда вход по `http://IP` на порт 80 через Nginx → прокси на 3001, или напрямую `http://IP:3001` без Nginx (нежелательно для продакшена).

После Nginx в `notamax.service` можно оставить `PORT=3001` и не открывать 3001 наружу:

```bash
sudo ufw delete allow 3001/tcp  # если добавлял
```

## 8. Обновление после `git pull`

```bash
cd /opt/notamax
git pull
cd client && npm ci && npm run build
cd ../server && npm ci && npm run build && npm ci --omit=dev
sudo systemctl restart notamax
```

---

Переменные окружения (опционально, в `notamax.service` в секции `[Service]`):

`Environment=ALLOWED_ORIGINS=https://твой-домен.ru` — если фронт с другого origin.

Если фронт отдельно: при сборке клиента задать `VITE_SOCKET_URL=https://api.домен.ru`.
