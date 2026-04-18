# BedR Admin Panel

A full-stack property management admin panel for managing flats, rooms, beds, and tenant assignments. Built as part of the BedR Full Stack Intern Assignment.

**Live Demo:** [https://bedr-admin.vercel.app](https://bedr-admin.vercel.app)  
**API Base URL:** [https://bedr-backend.onrender.com/api](https://bedr-backend.onrender.com/api)  
**API Documentation:** [https://bedr-backend.onrender.com/api/docs](https://bedr-backend.onrender.com/api/docs)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Data Model](#data-model)
- [Business Logic](#business-logic)
- [API Reference](#api-reference)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Seed Script](#seed-script)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

---

## Overview

BedR Admin Panel follows a strict four-level property hierarchy:

```
Flat → Room → Bed → Tenant Assignment
```

Every entity belongs to its parent. A tenant is always assigned to a specific bed — never to a room or flat directly. All business rules are enforced on the backend regardless of client-side state.

---

## Features

### Core Features
- **Flat Management** — Create, view, and delete flats with occupancy summaries
- **Room Management** — Create rooms under a flat with configurable bed capacity limits
- **Bed Management** — Create beds, manage status (`available` / `occupied` / `under_maintenance`)
- **Tenant Management** — Create tenants, assign to beds, move between beds, unassign
- **Occupancy Dashboard** — Real-time occupancy percentages per flat, per room, and system-wide

### Security & Production Features
- **API Key Authentication** — All endpoints protected via `x-api-key` header
- **Rate Limiting** — 200 requests per 15 minutes per IP with clean JSON error response
- **Swagger UI** — Full interactive API documentation at `/api/docs`
- **Seed Script** — One-command database population for evaluation
- **Health Check** — `/api/health` endpoint for deployment monitoring
- **Helmet** — Secure HTTP headers on all responses
- **CORS** — Configured for specific frontend origin only

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18 |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query v5 |
| HTTP Client | Axios |
| Backend | Node.js 20, Express.js 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Data Model

```
┌─────────────────┐
│      Flat       │
│  id, name,      │
│  address        │
└────────┬────────┘
         │ 1:many
┌────────▼────────┐
│      Room       │
│  id, name,      │
│  max_capacity,  │
│  flat_id        │
└────────┬────────┘
         │ 1:many
┌────────▼────────┐
│       Bed       │
│  id, label,     │
│  status,        │   status: available | occupied | under_maintenance
│  room_id        │
└────────┬────────┘
         │ 1:many
┌────────▼────────┐     ┌─────────────────┐
│ TenantAssignment│     │     Tenant      │
│  id, is_active, ├─────┤  id, name,      │
│  assigned_at,   │     │  email, phone   │
│  bed_id,        │     └─────────────────┘
│  tenant_id      │
└─────────────────┘
```

`TenantAssignment` uses `is_active` to preserve history. When a tenant moves beds, the old assignment is deactivated (`is_active = false`) and a new one is created — full audit trail is maintained.

---

## Business Logic

All rules are enforced **server-side** regardless of client state:

| Rule | HTTP Code | Error Code |
|------|-----------|------------|
| Bed with status `under_maintenance` cannot be assigned | 409 | `BED_UNDER_MAINTENANCE` |
| Bed with status `occupied` cannot be assigned to another tenant | 409 | `BED_OCCUPIED` |
| Room cannot have more beds than its `max_capacity` | 409 | `ROOM_AT_CAPACITY` |
| Flat cannot be deleted if any beds have active assignments | 409 | `FLAT_HAS_ACTIVE_ASSIGNMENTS` |
| Tenant cannot be deleted while assigned to a bed | 409 | `TENANT_HAS_ACTIVE_ASSIGNMENT` |
| Reassigning a tenant automatically marks previous bed as `available` | — | (transaction) |

Tenant reassignment and moves use **Prisma transactions** — if any step fails, all changes are rolled back atomically.

---

## API Reference

Full interactive docs available at `/api/docs` (Swagger UI). Authorize with your `API_KEY`.

### Authentication
Every request (except `/api/health` and `/api/docs`) requires:
```
x-api-key: <your-api-key>
```

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Occupancy summary |
| GET | `/api/flats` | List all flats |
| POST | `/api/flats` | Create flat |
| GET | `/api/flats/:id` | Get flat with rooms |
| DELETE | `/api/flats/:id` | Delete flat |
| GET | `/api/flats/:flatId/rooms` | List rooms in flat |
| POST | `/api/flats/:flatId/rooms` | Create room |
| GET | `/api/rooms/:id` | Get room with beds |
| DELETE | `/api/rooms/:id` | Delete room |
| GET | `/api/rooms/:roomId/beds` | List beds in room |
| POST | `/api/rooms/:roomId/beds` | Create bed |
| GET | `/api/beds/:id` | Get bed with history |
| PATCH | `/api/beds/:id/status` | Update bed status |
| DELETE | `/api/beds/:id` | Delete bed |
| GET | `/api/tenants` | List all tenants |
| POST | `/api/tenants` | Create tenant |
| GET | `/api/tenants/:id` | Get tenant with history |
| DELETE | `/api/tenants/:id` | Delete tenant |
| POST | `/api/assignments` | Assign tenant to bed |
| PATCH | `/api/assignments/:id/move` | Move tenant to new bed |
| DELETE | `/api/assignments/:id` | Unassign tenant |

### Response Format

All responses follow a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "BED_OCCUPIED",
    "message": "This bed is currently occupied. Choose a different bed."
  }
}
```

---

## Local Setup

### Prerequisites

- Node.js v18 or higher
- A [Supabase](https://supabase.com) account (free tier works)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/aatif-shaikh19/bedr-admin.git
cd bedr-admin
```

### 2. Set up the Backend

```bash
cd backend
npm install
```

Create your `.env` file (see [Environment Variables](#environment-variables) below):

```bash
cp .env.example .env
# Fill in your values in .env
```

Push the database schema to Supabase:

```bash
npx prisma db push
npx prisma generate
```

Start the backend server:

```bash
npm run dev
# Server runs at http://localhost:5000
# Swagger docs at http://localhost:5000/api/docs
```

### 3. Set up the Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create your `.env.local` file:

```bash
cp .env.local.example .env.local
# Fill in your values
```

Start the frontend:

```bash
npm run dev
# App runs at http://localhost:3000
```

### 4. Seed the Database (Optional but Recommended)

In the backend terminal:

```bash
npm run seed
```

This creates:
- 2 flats (Green Valley PG, Metro Heights)
- 3 rooms across those flats
- 7 beds with varied statuses
- 4 tenants (3 assigned, 1 unassigned)

---

## Environment Variables

### Backend — `backend/.env`

```env
# Get from: Supabase → Connect → ORM → Prisma → Transaction Pooler URL
DATABASE_URL="postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Get from: Supabase → Connect → ORM → Prisma → Direct Connection URL
DIRECT_URL="postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Any secret string — must match NEXT_PUBLIC_API_KEY in frontend
API_KEY=your-secret-api-key-here
```

### Frontend — `frontend/.env.local`

```env
# Backend API base URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Must match API_KEY in backend .env
NEXT_PUBLIC_API_KEY=your-secret-api-key-here
```

> **Note on Supabase password special characters:** If your Supabase password contains special characters, URL-encode them. For example: `@` → `%40`, `!` → `%21`, `$` → `%24`.

---

## Seed Script

```bash
cd backend
npm run seed
```

The seed script wipes all existing data and creates a fresh set of sample records. Safe to run multiple times — it clears before seeding. Use this to quickly reset the database to a known state during evaluation.

---

## Deployment

### Backend on Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set root directory to `backend`
3. Build command: `npm install && npx prisma generate`
4. Start command: `node src/index.js`
5. Add all environment variables from `backend/.env` (with production values)
6. Set `NODE_ENV=production` and `FRONTEND_URL=https://your-app.vercel.app`

### Frontend on Vercel

1. Import your GitHub repo on [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → your Render backend URL + `/api`
   - `NEXT_PUBLIC_API_KEY` → same key as backend `API_KEY`

---

## Project Structure

```
bedr-admin/
├── README.md
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Data models and relationships
│   ├── src/
│   │   ├── index.js               # Express app, middleware, routes
│   │   ├── seed.js                # Database seed script
│   │   ├── lib/
│   │   │   ├── prisma.js          # Prisma client singleton
│   │   │   └── swagger.js         # Swagger/OpenAPI config
│   │   ├── middleware/
│   │   │   ├── auth.js            # API key authentication
│   │   │   ├── errorHandler.js    # Global error handler + AppError class
│   │   │   └── validate.js        # express-validator middleware
│   │   ├── routes/
│   │   │   ├── flats.js
│   │   │   ├── rooms.js
│   │   │   ├── beds.js
│   │   │   ├── tenants.js
│   │   │   ├── assignments.js
│   │   │   └── dashboard.js
│   │   └── controllers/
│   │       ├── flats.controller.js
│   │       ├── rooms.controller.js
│   │       ├── beds.controller.js
│   │       ├── tenants.controller.js
│   │       ├── assignments.controller.js
│   │       └── dashboard.controller.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── app/
    │   ├── layout.js              # Root layout with navbar
    │   ├── providers.jsx          # TanStack Query provider
    │   ├── page.js                # Dashboard
    │   ├── flats/
    │   │   ├── page.js            # Flats list
    │   │   └── [id]/
    │   │       ├── page.js        # Flat detail with rooms
    │   │       └── rooms/[roomId]/
    │   │           └── page.js    # Room detail with beds
    │   └── tenants/
    │       └── page.js            # Tenants list
    ├── components/
    │   ├── Navbar.jsx
    │   ├── BedStatusBadge.jsx
    │   ├── OccupancyBar.jsx
    │   ├── PageHeader.jsx
    │   ├── LoadingSpinner.jsx
    │   ├── ErrorMessage.jsx
    │   └── ui/                    # shadcn/ui components
    ├── lib/
    │   ├── api.js                 # Axios instance + all API functions
    │   └── queryClient.js         # TanStack Query config
    ├── .env.local.example
    └── package.json
```
