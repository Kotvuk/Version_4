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

## Начальные данные

### Администратор
- **Email:** admin@corp.kz
- **Пароль:** AdminDamir
- **Имя:** Administrator

## API Endpoints

### POST /api/auth/login
Вход в систему

**Request:**
```json
{
  "email": "admin@corp.kz",
  "password": "AdminDamir"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Вход выполнен успешно",
  "user": {
    "id": 1,
    "name": "Administrator",
    "email": "admin@corp.kz"
  }
}
```

**Response (Error):**
```json
{
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
  "user": {
    "id": 2,
    "name": "Имя Фамилия",
    "email": "user@example.com"
  }
}
```

**Response (Error):**
```json
{
  "error": "Пользователь с таким email уже существует"
}
```

## Безопасность

- Пароли хешируются с помощью **bcrypt** (10 раундов)
- Минимальная длина пароля: **6 символов**
- Email уникален в системе
