# Временный HTTPS через ngrok (без Nginx)

Node (notamax) должен слушать тот порт, который пробрасываешь — например **3010** (`PORT` в `notamax.service`).

## 1. Аккаунт и токен

1. Регистрация: https://dashboard.ngrok.com/signup  
2. В дашборде: **Your Authtoken** → скопировать.

## 2. Установка на VPS (Linux, amd64)

Официальный бинарник (подходит для большинства VPS):

```bash
cd /tmp
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
sudo tar xvzf ngrok-v3-stable-linux-amd64.tgz -C /usr/local/bin
```

ARM64: скачай архив для `linux_arm64` с https://download.ngrok.com/

Привязка аккаунта:

```bash
ngrok authtoken ВСТАВЬ_ТОКЕН
```

Альтернатива на Ubuntu: `sudo snap install ngrok`

## 2.1. Ошибка `ERR_NGROK_9040` (агент с VPS не подключается)

Сообщение вида *We do not allow agents to connect from your IP* значит: **ngrok не принимает соединения агента с IP твоего сервера**. Исключений нет — **запускать `ngrok` на этом VPS бесполезно**.

**Обход A — ngrok на домашнем ПК + SSH к VPS**

1. На ПК (Windows/Linux), где ngrok разрешён:

   ```bash
   ssh -L 3010:127.0.0.1:3010 root@ТВОЙ_VPS_IP
   ```

   Сессию не закрывать.

2. На том же ПК: `ngrok http 3010` → открывай выданный `https://…`.

**Обход B — туннель на VPS без ngrok (Cloudflare)**

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cf.deb
sudo dpkg -i /tmp/cf.deb
cloudflared tunnel --url http://127.0.0.1:3010
```

В выводе будет временный `https://….trycloudflare.com`.

Подробнее: https://ngrok.com/docs/errors/err_ngrok_9040

## 3. Запуск туннеля

Приложение уже должно быть доступно локально на VPS:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3010/
```

Туннель:

```bash
ngrok http 3010
```

В терминале появится строка **Forwarding** — открой в браузере **`https://....ngrok-free.app`** (именно https).

## 4. Поведение notamax

Сборка клиента **без** `VITE_SOCKET_URL`: Socket.io идёт на тот же хост, что и страница — с ngrok URL всё сходится, Web Crypto работает (HTTPS).

## 5. Замечания free tier

- URL **меняется** при каждом новом запуске `ngrok` (пока не купишь статический домен).
- Иногда ngrok показывает промежуточную страницу — нажми **Visit Site** / продолжить, затем обнови при необходимости.
- Для постоянного продакшена лучше домен + Let’s Encrypt + Nginx.

## 6. Опционально: ngrok в фоне

```bash
nohup ngrok http 3010 --log=stdout > /tmp/ngrok.log 2>&1 &
```

Смотреть выданный URL: `curl -s http://127.0.0.1:4040/api/tunnels` (локальный API ngrok на машине, где запущен агент).
