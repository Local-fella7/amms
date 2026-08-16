# Association Membership Management System (AMMS) API

REST API built with **CodeIgniter 4** for managing association membership, fees, payments, notifications, role-based access, and audit logs.

Based on the database schema by **Dropping Zone (T) Ltd**, Arusha, Tanzania.

---

## Requirements

- PHP 8.0+
- MySQL 5.7+ / MariaDB
- Composer
- XAMPP (or equivalent Apache + MySQL stack)

## Quick Start

```bash
# Install dependencies
composer install

# Configure environment
cp env .env
# Edit .env: database credentials, jwt.secretKey, app.baseURL

# Create database
php spark db:create amms

# Run migrations & seed sample data
php spark migrate
php spark db:seed AmmsSeeder

# Start development server (optional)
php spark serve
```

**Default admin credentials (after seeding):**

| Field    | Value              |
|----------|--------------------|
| Email    | `admin@amms.local` |
| Password | `admin123`         |

**Base URL:** `http://localhost/amms/public/api`

---

## Architecture (DRY Design)

```
app/
├── Config/
│   ├── ApiValidation.php    # Centralized validation rules
│   ├── Jwt.php              # JWT configuration
│   └── Routes/Api.php       # All API routes
├── Controllers/Api/
│   ├── BaseApiController.php    # JSON responses, validation helper
│   ├── CrudApiController.php    # Generic CRUD (index/show/create/update/delete)
│   └── *Controller.php          # Thin controllers delegating to services
├── Services/
│   ├── BaseService.php      # Shared CRUD + audit logging
│   ├── AuthService.php      # Login & user retrieval
│   ├── AuditLogService.php  # Audit trail writes
│   └── *Service.php         # Entity-specific business logic
├── Models/                  # One model per table (extends BaseModel)
├── Filters/JwtAuthFilter.php
├── Libraries/JwtService.php
└── Traits/ApiResponseTrait.php
```

Every resource controller extends `CrudApiController` and only defines its service and validation key — no duplicated CRUD logic.

---

## Authentication (JWT)

1. **Login** — `POST /api/auth/login`

```json
{
  "email": "admin@amms.local",
  "password": "admin123"
}
```

2. Use the returned token in all protected requests:

```
Authorization: Bearer <token>
```

3. **Get current user** — `GET /api/auth/me`

### JWT Configuration (`.env`)

```
jwt.secretKey = 'your-secret-key-at-least-32-characters'
jwt.expiration = 86400
```

---

## Database Schema (16 Tables)

| # | Table                   | Description                          |
|---|-------------------------|--------------------------------------|
| 1 | `users`                 | System users (admin, staff)          |
| 2 | `features`              | Individual permissions               |
| 3 | `features_group`        | Feature categories                   |
| 4 | `roles`                 | User roles                           |
| 5 | `roles_features`        | Role ↔ Feature mapping              |
| 6 | `association`           | Association profile                  |
| 7 | `age_groups`            | Member age brackets                  |
| 8 | `notification_templates`| Reusable message templates           |
| 9 | `locations`             | Member locations                     |
| 10| `fee`                   | Annual membership fees               |
| 11| `payment_modes`         | Payment methods                      |
| 12| `members`               | Registered members                   |
| 13| `fee_payments`          | Payment records                      |
| 14| `notifications`         | Composed notifications               |
| 15| `notifications_members` | Notification ↔ Member delivery      |
| 16| `logs`                  | Audit trail                          |

### Key Relationships

- `users.role_id` → `roles.id`
- `features.features_group_id` → `features_group.id`
- `roles_features` → links `roles` and `features`
- `members.location_id` → `locations.id`
- `members.age_group_id` → `age_groups.id`
- `fee_payments` → `members`, `fee`, `payment_modes`
- `notifications.notification_template_id` → `notification_templates.id`
- `notifications_members` → `notifications`, `members`
- `logs` → `users`, `features`

---

## API Endpoints

All endpoints except `POST /api/auth/login` require JWT authentication.

| Resource               | GET List | GET One | POST | PUT | DELETE |
|------------------------|----------|---------|------|-----|--------|
| `/roles`               | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/feature-groups`      | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/features`            | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/role-features`       | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/users`               | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/association`         | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/age-groups`          | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/notification-templates` | ✅    | ✅      | ✅   | ✅  | ✅     |
| `/locations`           | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/fees`                | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/payment-modes`       | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/members`             | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/fee-payments`        | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/notifications`       | ✅       | ✅      | ✅   | ✅  | ✅     |
| `/notification-members`| ✅       | ✅      | ✅   | ✅  | ✅     |
| `/logs`                | ✅       | ✅      | ✅   | ✅  | ✅     |

Full endpoint documentation: [docs/API.md](docs/API.md)

---

## Response Format

**Success:**
```json
{
  "status": "success",
  "message": "Role list retrieved",
  "data": []
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": { "name": "The name field is required." }
}
```

---

## Testing

Tests use a separate database `amms_test`.

```bash
# Create test database
php spark db:create amms_test

# Run all tests (253 tests)
vendor/bin/phpunit
```

Test structure:
- `tests/unit/Services/` — Unit tests for every service method
- `tests/unit/Libraries/` — JWT library tests
- `tests/feature/Api/` — Full HTTP feature tests for all endpoints

---

## Postman Collection

Import the ready-to-use collection:

```
docs/postman/AMMS_API.postman_collection.json
```

1. Import into Postman
2. Run **Auth → Login** to auto-save the JWT token
3. All other requests use the saved token automatically

---

## CLI Commands

```bash
php spark routes              # List all routes
php spark migrate             # Run migrations
php spark migrate:rollback    # Rollback last batch
php spark db:seed AmmsSeeder  # Seed sample data
php spark key:generate        # Generate encryption key
```

---

## License

MIT
