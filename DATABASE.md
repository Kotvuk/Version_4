# База данных KotvukAI

## SQLite Database: kotvukai.db

### Таблица: users

| Поле       | Тип      | Описание                          |
|------------|----------|-----------------------------------|
| id         | INTEGER  | PRIMARY KEY, AUTO INCREMENT       |
| name       | TEXT     | Имя пользователя                  |
| email      | TEXT     | Email (UNIQUE)                    |
| password   | TEXT     | Хешированный пароль (bcrypt)      |
| created_at | DATETIME | Дата создания (DEFAULT CURRENT_TIMESTAMP) |

### Таблица: demo_accounts

| Поле            | Тип      | Описание                          |
|-----------------|----------|-----------------------------------|
| id              | INTEGER  | PRIMARY KEY, AUTO INCREMENT       |
| user_id         | INTEGER  | FK → users(id) ON DELETE CASCADE  |
| name            | TEXT     | Название счёта                    |
| account_type    | TEXT     | Тип (user / ai)                   |
| balance         | REAL     | Текущий баланс CHECK(balance >= 0)|
| initial_balance | REAL     | Начальный баланс CHECK(> 0)       |
| created_at      | DATETIME | Дата создания                     |

### Таблица: trades

| Поле              | Тип      | Описание                          |
|-------------------|----------|-----------------------------------|
| id                | INTEGER  | PRIMARY KEY, AUTO INCREMENT       |
| demo_account_id   | INTEGER  | FK → demo_accounts(id) CASCADE    |
| user_id           | INTEGER  | FK → users(id) CASCADE            |
| symbol            | TEXT     | Торговая пара                     |
| type              | TEXT     | buy / sell                        |
| entry_price       | REAL     | Точка входа CHECK(> 0)           |
| exit_price        | REAL     | Точка выхода (nullable)           |
| amount            | REAL     | Сумма CHECK(> 0)                  |
| profit            | REAL     | Профит/убыток                     |
| status            | TEXT     | open / closed                     |
| created_at        | DATETIME | Дата открытия                     |
| closed_at         | DATETIME | Дата закрытия                     |

## Начальные данные

### Администратор

Администратор создаётся автоматически из переменных окружения:

```
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Administrator
```

Если переменные не заданы, администратор не будет создан.

## API Endpoints

### POST /api/auth/login
Вход в систему

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Вход выполнен успешно",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "name": "Имя",
    "email": "user@example.com"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Неверный email или пароль"
}
```

### POST /api/auth/register
Регистрация нового пользователя

**Request:**
```json
{
  "name": "Имя Фамилия",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Регистрация выполнена успешно",
  "token": "jwt-token-here",
  "user": {
    "id": 2,
    "name": "Имя Фамилия",
    "email": "user@example.com"
  }
}
```

### GET /api/auth/logout
Выход из системы (очистка httpOnly cookie)

## Безопасность

- Пароли хешируются с помощью **bcrypt** (10 раундов)
- Минимальная длина пароля: **6 символов**
- Email уникален в системе
- JWT хранится в httpOnly cookie (+ fallback через Authorization header)
- IDOR защита: все account-related роуты проверяют ownership
- XSS защита: escapeHtml() на фронтенде
- Rate limiting: 300 req/15min общий, 5 req/min для ИИ
- CORS настроен с credentials
- Helmet security headers
- Foreign keys с ON DELETE CASCADE
- Индексы на часто запрашиваемых полях
