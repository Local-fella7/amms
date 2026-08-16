# AMMS API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost/amms/public/api`  
**Authentication:** JWT Bearer Token  

---

## Table of Contents

1. [Authentication](#authentication)
2. [Common Headers](#common-headers)
3. [Response Codes](#response-codes)
4. [Endpoints](#endpoints)
   - [Roles](#roles)
   - [Feature Groups](#feature-groups)
   - [Features](#features)
   - [Role Features](#role-features)
   - [Users](#users)
   - [Association](#association)
   - [Age Groups](#age-groups)
   - [Notification Templates](#notification-templates)
   - [Locations](#locations)
   - [Fees](#fees)
   - [Payment Modes](#payment-modes)
   - [Members](#members)
   - [Fee Payments](#fee-payments)
   - [Notifications](#notifications)
   - [Notification Members](#notification-members)
   - [Audit Logs](#audit-logs)

---

## Authentication

### Login

Obtain a JWT token.

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "admin@amms.local",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": "1",
      "first_name": "System",
      "last_name": "Admin",
      "email": "admin@amms.local",
      "role_id": "1",
      "status": "active"
    }
  }
}
```

### Get Authenticated User

```
GET /auth/me
Authorization: Bearer <token>
```

---

## Common Headers

| Header          | Value                    | Required        |
|-----------------|--------------------------|-----------------|
| Authorization   | Bearer `<jwt_token>`     | Protected routes|
| Content-Type    | application/json         | POST, PUT       |

---

## Response Codes

| Code | Meaning                              |
|------|--------------------------------------|
| 200  | Success                              |
| 201  | Created                              |
| 401  | Unauthorized (missing/invalid token) |
| 404  | Resource not found                   |
| 422  | Validation error                     |
| 500  | Server error                         |

---

## Endpoints

Each resource supports the same CRUD pattern:

| Method | Path           | Action          |
|--------|----------------|-----------------|
| GET    | `/{resource}`  | List all        |
| GET    | `/{resource}/{id}` | Get one     |
| POST   | `/{resource}`  | Create          |
| PUT    | `/{resource}/{id}` | Update      |
| DELETE | `/{resource}/{id}` | Delete      |

---

### Roles

**Endpoint:** `/roles`

**Create Body:**
```json
{
  "name": "Admin"
}
```

**Fields:**

| Field | Type   | Required | Description  |
|-------|--------|----------|--------------|
| name  | string | Yes      | Role name    |

---

### Feature Groups

**Endpoint:** `/feature-groups`

**Create Body:**
```json
{
  "name": "Membership"
}
```

---

### Features

**Endpoint:** `/features`

**Create Body:**
```json
{
  "name": "Manage Members",
  "features_group_id": 2
}
```

**Fields:**

| Field              | Type    | Required | FK                    |
|--------------------|---------|----------|-----------------------|
| name               | string  | Yes      | —                     |
| features_group_id  | integer | Yes      | features_group.id     |

**Response includes:** `features_group_name` (joined)

---

### Role Features

**Endpoint:** `/role-features`

**Create Body:**
```json
{
  "role_id": 1,
  "feature_id": 3
}
```

**Fields:**

| Field      | Type    | Required | FK          |
|------------|---------|----------|-------------|
| role_id    | integer | Yes      | roles.id    |
| feature_id | integer | Yes      | features.id |

**Response includes:** `role_name`, `feature_name` (joined)

---

### Users

**Endpoint:** `/users`

**Create Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "255700000001",
  "password": "securepass",
  "role_id": 1,
  "status": "active"
}
```

**Fields:**

| Field      | Type   | Required | Notes                          |
|------------|--------|----------|--------------------------------|
| first_name | string | Yes      |                                |
| last_name  | string | Yes      |                                |
| email      | string | Yes      | Unique                         |
| phone      | string | No       |                                |
| password   | string | Yes*     | Required on create only        |
| role_id    | int    | Yes      | FK → roles.id                  |
| status     | enum   | No       | `active` or `inactive`         |

> Password is never returned in responses.

---

### Association

**Endpoint:** `/association`

**Create Body:**
```json
{
  "name": "Arusha Community Association",
  "address": "Arusha, Tanzania",
  "chairman_phone": "255711111111",
  "secretary_phone": "255722222222",
  "treasurer_phone": "255733333333",
  "logo": "/uploads/logo.png"
}
```

---

### Age Groups

**Endpoint:** `/age-groups`

**Create Body:**
```json
{
  "name": "Youth",
  "from_age": 0,
  "to_age": 17
}
```

---

### Notification Templates

**Endpoint:** `/notification-templates`

**Create Body:**
```json
{
  "name": "Welcome Message",
  "content": "Welcome {{first_name}} to our association!"
}
```

---

### Locations

**Endpoint:** `/locations`

**Create Body:**
```json
{
  "name": "Arusha City"
}
```

---

### Fees

**Endpoint:** `/fees`

**Create Body:**
```json
{
  "name": "Annual Subscription 2026",
  "amount": 50000.00,
  "year": 2026
}
```

---

### Payment Modes

**Endpoint:** `/payment-modes`

**Create Body:**
```json
{
  "name": "Mobile Money"
}
```

---

### Members

**Endpoint:** `/members`

**Create Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "fathers_name": "James Doe",
  "mothers_name": "Jane Doe",
  "location_id": 1,
  "picture": "/uploads/members/john.jpg",
  "date_of_birth": "1990-05-15",
  "member_status": "active",
  "marital_status": "married",
  "phone": "255744444444",
  "fee_exemption": "no",
  "age_group_id": 2,
  "registration_date": "2026-01-15"
}
```

**Fields:**

| Field             | Type   | FK              | Enum Values                              |
|-------------------|--------|-----------------|------------------------------------------|
| location_id       | int    | locations.id    | —                                        |
| age_group_id      | int    | age_groups.id   | —                                        |
| member_status     | enum   | —               | active, inactive                         |
| marital_status    | enum   | —               | single, married, divorced, widowed       |
| fee_exemption     | enum   | —               | yes, no                                  |

**Response includes:** `location_name`, `age_group_name` (joined)

---

### Fee Payments

**Endpoint:** `/fee-payments`

**Create Body:**
```json
{
  "date": "2026-02-15",
  "payment_mode_id": 2,
  "amount": 50000.00,
  "fee_id": 1,
  "member_id": 1
}
```

**Response includes:** `payment_mode_name`, `fee_name`, `member_first_name`, `member_last_name`

---

### Notifications

**Endpoint:** `/notifications`

**Create Body:**
```json
{
  "name": "Annual Meeting Notice",
  "notification_template_id": 1,
  "content": "Dear members, our annual meeting is on March 1st."
}
```

**Response includes:** `template_name` (joined)

---

### Notification Members

**Endpoint:** `/notification-members`

Links a notification to its recipient members.

**Create Body:**
```json
{
  "notification_id": 1,
  "member_id": 1
}
```

**Response includes:** `notification_name`, `member_first_name`, `member_last_name`

---

### Audit Logs

**Endpoint:** `/logs`

Read-only audit trail (also auto-created on CRUD operations).

**Create Body (manual):**
```json
{
  "feature_id": 1,
  "user_id": 1,
  "datetime": "2026-08-03 10:00:00",
  "before": "{\"name\":\"Old\"}",
  "after": "{\"name\":\"New\"}"
}
```

**Response includes:** `feature_name`, `user_first_name`, `user_last_name`

---

## Entity Relationship Diagram

```
roles ────────────── users
  │                    │
  └── roles_features   │
         │             │
features ─ features_group
         │
        logs

locations ── members ── age_groups
                │
         fee_payments ── fee
                │
         payment_modes

notification_templates ── notifications ── notifications_members ── members
```

---

## Error Examples

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "Missing or invalid authorization token"
}
```

**422 Validation Error:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "email": "The email field is required."
  }
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Member not found"
}
```
