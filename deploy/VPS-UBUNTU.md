# Деплой notamax на VPS (Ubuntu, бесплатно)

Эта инструкция даёт 2 рабочих режима:
- Быстрый запуск сегодня: HTTPS через Cloudflare Quick Tunnel (без домена).
- Стабильный бесплатный вариант: домен + Nginx + Let's Encrypt.

Путь проекта в примерах: `/opt/notamax`.

## 1) Подготовка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl ufw
```

Node.js 24 (как в проекте):

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2) Код на сервере

```bash
sudo mkdir -p /opt/notamax
sudo chown "$USER":"$USER" /opt/notamax
cd /opt/notamax
git clone <URL_репозитория> .
```

## 3) Установка зависимостей и сборка

Из корня проекта:

```bash
cd /opt/notamax
npm run install:all
npm run build:all
npm run postbuild:server:prod
```

Проверка артефактов:

```bash
test -f /opt/notamax/client/dist/index.html && echo "client ok"
test -f /opt/notamax/server/dist/index.js && echo "server ok"
```

## 4) Systemd (автозапуск backend)

### 4.1 Создать системного пользователя

```bash
sudo useradd -r -s /usr/sbin/nologin notamax 2>/dev/null || true
sudo chown -R notamax:notamax /opt/notamax
```

### 4.2 Установить unit

```bash
sudo cp /opt/notamax/deploy/notamax.service /etc/systemd/system/notamax.service
sudo systemctl daemon-reload
sudo systemctl enable notamax
sudo systemctl restart notamax
sudo systemctl status notamax --no-pager
```

Если приложение слушает другой порт, измени `Environment=PORT=` в
`/etc/systemd/system/notamax.service`, затем:

```bash
sudo systemctl daemon-reload
sudo systemctl restart notamax
```

Логи:

```bash
journalctl -u notamax -f
```

### 4.3 Локальная проверка backend на VPS

```bash
curl -I http://127.0.0.1:3010/
```

Ожидается HTTP 200/304.

## 5) Вариант A: быстрый бесплатный HTTPS без домена (Cloudflare Quick Tunnel)

Этот вариант даёт публичный `https://...trycloudflare.com`, чтобы сразу работал
Web Crypto в браузере.

### 5.1 Установка cloudflared

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cf.deb
sudo dpkg -i /tmp/cf.deb
```

### 5.2 Запуск туннеля

```bash
cloudflared tunnel --url http://127.0.0.1:3010
```

Открой выданный `https://...trycloudflare.com`.

Или через helper-скрипт из репозитория:

```bash
cd /opt/notamax
bash deploy/quick-tunnel.sh 3010
```

Важно:
- Терминал с `cloudflared` должен оставаться открытым.
- URL меняется при каждом новом запуске.

## 6) Вариант B: стабильный бесплатный деплой (домен + Nginx + Let's Encrypt)

### 6.1 Подключить домен

Возьми бесплатный домен (например, DuckDNS) или любой свой и направь `A` запись
на IP VPS.

### 6.2 Настроить Nginx

```bash
sudo cp /opt/notamax/deploy/nginx-notamax.conf.example /etc/nginx/sites-available/notamax
sudo nano /etc/nginx/sites-available/notamax
```

Проверь:
- `server_name` = твой домен
- `proxy_pass` = `http://127.0.0.1:3010`

Включить сайт:

```bash
sudo ln -sf /etc/nginx/sites-available/notamax /etc/nginx/sites-enabled/notamax
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 Выпустить сертификат Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
```

Проверка автопродления:

```bash
systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

## 7) Firewall (минимум)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

Если ранее открывал порт backend наружу, закрой:

```bash
sudo ufw delete allow 3010/tcp
```

## 8) Обновление после `git pull`

```bash
cd /opt/notamax
git pull
npm run install:all
npm run build:all
npm run postbuild:server:prod
sudo systemctl restart notamax
```

## 9) Проверка работоспособности (чек-лист)

1. Открывается `https://...` (не `http://IP`).
2. Создание аккаунта проходит без ошибки.
3. Восстановление по recovery key работает.
4. Две вкладки/два устройства обмениваются сообщениями.
5. После `sudo reboot` сервис поднимается автоматически.

Можно запустить автоматизированную базовую проверку:

```bash
cd /opt/notamax
bash deploy/acceptance-check.sh your-domain.example 3010
```

## 10) Частые проблемы

- **`Не удалось создать аккаунт` на HTTP:** нужен HTTPS или localhost.
- **`502 Bad Gateway`:** notamax.service не запущен или не тот `PORT`.
- **`EADDRINUSE`:** порт уже занят другим процессом.
- **Сокет не коннектится:** проверь `proxy_set_header Upgrade` и `Connection "upgrade"` в Nginx.
