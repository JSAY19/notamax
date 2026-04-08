# notamax.io
Notamax — это веб-мессенджер в браузере с сквозным шифрованием (E2E): сообщения шифруются у отправителя и расшифровываются только у получателя, сервер лишь пересылает данные по WebSocket (Socket.io) и не видит текст переписки.

## Deploy

- Полная бесплатная инструкция для VPS: `deploy/VPS-UBUNTU.md`
- Временный HTTPS через ngrok (fallback): `deploy/ngrok.md`
- Шаблон systemd unit: `deploy/notamax.service`
- Шаблон Nginx-конфига: `deploy/nginx-notamax.conf.example`
