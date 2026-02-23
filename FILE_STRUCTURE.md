# KotvukAI — Структура файлов

## Серверная часть

```
server.js                    # Точка входа (100 строк): middleware, mount routes, graceful shutdown

routes/
├── auth.js                  # POST /login, /register, GET /logout (httpOnly cookies)
├── dashboard.js             # GET /stats, /profit-chart
├── accounts.js              # GET/POST/PATCH /demo-accounts/* (с IDOR защитой)
├── market.js                # GET /price, /klines, /global, /fear-greed, /search, /screener, /heatmap
└── ai.js                    # POST /analyze (с rate limiting)

middleware/
├── auth.js                  # authMiddleware (cookie → header fallback), generateToken
└── errorHandler.js          # Глобальный error handler + asyncHandler

services/
├── groq.js                  # groqRequest, callGroqEnsemble (ансамблевый AI)
└── binance.js               # fetchJson (с redirect protection), кэширование, SCREENER_SYMBOLS

utils/
├── constants.js             # Все именованные константы (балансы, TTL, лимиты)
└── indicators.js            # calcRSI, calcEMA, calcMACD, calcBollinger

database.js                  # SQLite: таблицы, индексы, constraints, CRUD функции
```

## Клиентская часть

```
public/
├── index.html               # Страница входа/регистрации
├── styles.css               # Стили авторизации
├── auth.js                  # Логика авторизации (toast уведомления, credentials: include)
├── dashboard.html           # Главная страница приложения
├── dashboard.css            # Все стили дашборда + toast + loading dot
├── dashboard.js             # Навигация, apiFetch, cleanupCurrentPage, logout
│
└── pages/
    ├── common.js            # escapeHtml(), showToast(), getUnderDevelopmentContent()
    ├── dashboard-page.js    # Панель: Дашборд (виджеты, график профита)
    ├── trades-page.js       # Панель: Список сделок (CRUD, модалки)
    ├── screener-page.js     # Панель: Скринер (Binance live)
    ├── heatmap-page.js      # Панель: Тепловая карта
    └── ai-page.js           # Панель: ИИ Анализ (Groq ансамбль)
```

## Конфигурация

```
.env.example                 # Шаблон переменных окружения
.gitignore                   # node_modules, .env, *.db, *.log
package.json                 # Зависимости: express, helmet, cors, cookie-parser, bcryptjs, jwt, sqlite3
```

## Где что редактировать

| Задача | Файл |
|--------|------|
| Добавить новый API endpoint | `routes/<module>.js` |
| Изменить логику БД | `database.js` |
| Новый технический индикатор | `utils/indicators.js` |
| Изменить AI промпт | `services/groq.js` |
| Добавить новый рыночный источник | `services/binance.js` |
| Изменить стили | `public/dashboard.css` |
| Новая страница | `public/pages/<name>-page.js` + навигация в `dashboard.html` и `dashboard.js` |
