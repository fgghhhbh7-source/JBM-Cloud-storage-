# JBM Storage Backend

Telegram-based file storage for JBM Cloud.

## Setup on Render

Environment variables:

- BOT_TOKEN = (new token from BotFather — never commit this)
- STORAGE_CHAT_ID = -1004432286903
- PORT = 3000 (optional)

Build: npm install
Start: npm start

## API

- POST /upload (form-data: file, phone)
- GET /files?phone=
- GET /download/:id?phone=
- DELETE /files/:id?phone=
