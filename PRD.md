# BedR Admin Panel — Product Requirements Document (PRD)

> **Version:** 1.0 | **Author:** Aatif Shaikh | **Date:** April 2026  
> **Assignment:** Full Stack Intern — Property Management Admin Panel

---

## 1. What Are We Building?

A **web-based admin panel** for BedR, a property management company. It lets an admin manage a hierarchy of properties: Flats → Rooms → Beds → Tenants. Every decision about the UI and API must serve this one job: make it easy to manage occupancy cleanly.

---

## 2. The Core Hierarchy (Most Important Concept)

```
FLAT
 └── ROOM  (belongs to one Flat)
      └── BED   (belongs to one Room)
           └── TENANT ASSIGNMENT  (one tenant assigned to one bed)
```

**Why does this matter?** This isn't just a data model — it's a constraint system. Every business rule flows from this hierarchy:
- You can't create a Room without a Flat
- You can't create a Bed without a Room
- You can't assign a Tenant without a Bed
- Deleting a parent must handle children gracefully

---

## 3. Entities & Their Fields

### 3.1 Flat
| Field      | Type     | Notes                          |
|------------|----------|--------------------------------|
| id         | UUID     | Primary key, auto-generated    |
| name       | String   | e.g. "Sunrise Apartments"      |
| address    | String   | Full address text              |
| created_at | DateTime | Auto-set on creation           |

### 3.2 Room
| Field        | Type     | Notes                          |
|--------------|----------|--------------------------------|
| id           | UUID     | Primary key                    |
| flat_id      | UUID     | Foreign key → Flat             |
| name         | String   | e.g. "Room 101"                |
| max_capacity | Integer  | Max number of beds allowed     |
| created_at   | DateTime |                                |

### 3.3 Bed
| Field      | Type   | Notes                                         |
|------------|--------|-----------------------------------------------|
| id         | UUID   | Primary key                                   |
| room_id    | UUID   | Foreign key → Room                            |
| label      | String | e.g. "Bed A", "Bed 1"                         |
| status     | Enum   | `available` / `occupied` / `under_maintenance`|
| created_at | DateTime |                                             |

### 3.4 Tenant
| Field       | Type     | Notes                     |
|-------------|----------|---------------------------|
| id          | UUID     | Primary key               |
| name        | String   | Full name                 |
| email       | String   | Unique, used as identifier|
| phone       | String   | Contact number            |
| created_at  | DateTime |                           |

### 3.5 TenantAssignment (Join Table)
| Field       | Type     | Notes                                        |
|-------------|----------|----------------------------------------------|
| id          | UUID     | Primary key                                  |
| tenant_id   | UUID     | Foreign key → Tenant                         |
| bed_id      | UUID     | Foreign key → Bed                            |
| assigned_at | DateTime | When the assignment was created              |
| is_active   | Boolean  | `true` = current assignment, `false` = past  |

> **Why a separate TenantAssignment table?** It lets you keep assignment history. When a tenant moves beds, you don't delete the old assignment — you mark it `is_active = false`. This is called **soft deletion** — the same pattern used in finsight-backend.

---

## 4. Features

### Feature 1: Flat Management
- **List all flats** with their address and occupancy summary
- **Create a flat** (name + address)
- **Delete a flat** — but only if no beds in that flat have active assignments
  - If active assignments exist: show a warning dialog with count of affected tenants
  - User must explicitly confirm before deletion proceeds
  - Backend must enforce this rule regardless of UI

### Feature 2: Room Management
- **List rooms under a flat**
- **Create a room** under a flat (name + max_capacity)
- **Delete a room** — only if no active assignments exist in its beds
- The room displays current bed count vs max capacity e.g. `2 / 3 beds`

### Feature 3: Bed Management
- **List beds under a room** with their current status
- **Create a bed** under a room — fails if room is already at max_capacity
- **Update bed status** manually (admin can mark a bed as Under Maintenance)
- Status changes automatically when tenant is assigned/unassigned

### Feature 4: Tenant Management
- **List all tenants** with their current assignment (if any)
- **Create a tenant** (name, email, phone)
- **Assign a tenant to a bed** — enforces:
  - Bed must be `available`
  - Tenant must not already have an active assignment
- **Move a tenant** to a different bed — old bed becomes `available`
- **Unassign a tenant** from their bed — bed becomes `available`
- **Delete a tenant** — only if they have no active assignment

### Feature 5: Occupancy Dashboard
- Table/list view showing per-flat occupancy: `X of Y beds occupied (Z%)`
- Breakdown per room within each flat
- No charts required — clean table is fine

---

## 5. Business Logic Rules (Backend Enforced — Non-Negotiable)

| # | Rule | Where Enforced |
|---|------|----------------|
| 1 | A bed with status `under_maintenance` cannot be assigned | Backend API |
| 2 | A bed with status `occupied` cannot be assigned to another tenant | Backend API |
| 3 | A room cannot have more beds than its `max_capacity` | Backend API |
| 4 | A flat cannot be deleted if any of its beds have active assignments | Backend API |
| 5 | A tenant cannot be deleted while assigned to a bed | Backend API |
| 6 | Reassigning a tenant must mark the previous bed as `available` | Backend API (transaction) |

> **Key insight:** Rules 4 and 6 require **database transactions** — multiple DB operations that must ALL succeed or ALL fail together. If rule 6 fails halfway (bed not updated), the assignment should also not be saved.

---

## 6. API Error Responses

Every API error must return a consistent JSON shape:

```json
{
  "success": false,
  "error": {
    "code": "BED_OCCUPIED",
    "message": "This bed is currently occupied and cannot be assigned."
  }
}
```

Success responses:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 7. Pages (Frontend Routes)

| Route                        | What it shows                          |
|-----------------------------|----------------------------------------|
| `/`                          | Dashboard — occupancy summary          |
| `/flats`                     | List of all flats                      |
| `/flats/[id]`                | Flat detail — rooms inside it          |
| `/flats/[id]/rooms/[roomId]` | Room detail — beds inside it           |
| `/tenants`                   | All tenants + their assignment status  |
| `/tenants/[id]`              | Tenant detail — assignment history     |

---

## 8. Genuinely Out of Scope

The following are neither mentioned nor implied by the assignment. We skip these entirely:
- Email or SMS notifications
- Rent / payment tracking
- Mobile application
- Real-time WebSocket updates
- Multi-tenant SaaS (multiple companies using the same system)

---

## 9. Above-and-Beyond Features (Differentiators)

The assignment does not require auth or API docs — but adding them cleanly shows a production mindset. These are small additions with high evaluator impact.

### 9.1 API Key Authentication
A single `API_KEY` environment variable. Every request must include `x-api-key: <key>` header. The frontend sends it automatically via Axios. This protects the deployed API from random public access.

> Why not JWT? JWT requires a login flow, user table, token refresh — significant scope. An API key is 15 lines of middleware and achieves the goal: the deployed app isn't wide open.

### 9.2 Rate Limiting
Using `express-rate-limit`: max 100 requests per 15 minutes per IP. Returns a clean JSON error if exceeded (not the default HTML response). Prevents abuse of the deployed API.

### 9.3 Swagger / OpenAPI Documentation
Using `swagger-jsdoc` + `swagger-ui-express`. Every endpoint is documented. Accessible at `/api/docs`. The evaluator can browse and test all endpoints without Postman. This is a **major differentiator** — most candidates don't do this.

### 9.4 Seed Script
A runnable script (`npm run seed`) that creates sample data: 2 flats, 3 rooms each, 2–3 beds each, 4 tenants, and some active assignments. The evaluator can run this and immediately see a populated dashboard. Directly comparable to what you built for finsight-backend.

### 9.5 Health Check Endpoint
`GET /api/health` returns server status, current timestamp, and environment. Standard in all production APIs. Used by Render to verify the backend is running.

### 9.6 Request Logging
`morgan` middleware logs every request with method, URL, status, and response time. Helps with debugging during evaluation.

---

## 10. Success Criteria

### Must-Pass (Assignment Requirements)
1. All 6 business logic rules enforced server-side
2. App deploys and works end-to-end
3. Error messages are clear and user-facing
4. README has local setup instructions + live links
5. Code is clean and logically structured

### Stand-Out Criteria (Our Additions)
6. Swagger docs live at `/api/docs`
7. API key auth protects all routes
8. Rate limiting is active on deployed backend
9. Seed script works with one command
10. Zero console errors in browser on deployed frontend
