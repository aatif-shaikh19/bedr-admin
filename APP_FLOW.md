# BedR Admin Panel — App Flow Document

> This document describes every user interaction, API call, and data flow in the application.
> Read this before writing a single line of code.

---

## 1. Complete API Reference

All endpoints are prefixed with `/api`.

### Flats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flats` | List all flats with occupancy counts |
| POST | `/api/flats` | Create a new flat |
| GET | `/api/flats/:id` | Get a single flat with its rooms |
| DELETE | `/api/flats/:id` | Delete flat (fails if active assignments exist) |

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flats/:flatId/rooms` | List all rooms in a flat |
| POST | `/api/flats/:flatId/rooms` | Create a room in a flat |
| GET | `/api/rooms/:id` | Get a single room with its beds |
| DELETE | `/api/rooms/:id` | Delete room (fails if active assignments) |

### Beds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms/:roomId/beds` | List all beds in a room |
| POST | `/api/rooms/:roomId/beds` | Create a bed in a room |
| PATCH | `/api/beds/:id/status` | Update bed status manually |
| DELETE | `/api/beds/:id` | Delete a bed (fails if occupied) |

### Tenants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tenants` | List all tenants with active assignments |
| POST | `/api/tenants` | Create a new tenant |
| GET | `/api/tenants/:id` | Get tenant with assignment history |
| DELETE | `/api/tenants/:id` | Delete tenant (fails if active assignment) |

### Assignments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assignments` | Assign a tenant to a bed |
| PATCH | `/api/assignments/:id/move` | Move tenant to a different bed |
| DELETE | `/api/assignments/:id` | Unassign tenant from bed |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Occupancy summary per flat and room |

---

## 2. Detailed Flow: Every User Action

### Flow 1: Creating a Flat

```
User fills form (name + address) → clicks "Create Flat"
  │
  ▼
Frontend: POST /api/flats
  Body: { name: "Sunrise Apartments", address: "123 MG Road, Bengaluru" }
  │
  ▼
Backend: express-validator checks
  - name: not empty, min 2 chars
  - address: not empty, min 5 chars
  │
  ├── FAIL → 422 { success: false, error: { code: "VALIDATION_ERROR", message: "..." } }
  │
  └── PASS → Prisma: flat.create({ data: { name, address } })
                │
                └── 201 { success: true, data: { id, name, address, created_at } }

Frontend: TanStack Query invalidates 'flats' cache → list refreshes automatically
```

---

### Flow 2: Creating a Room

```
User is on /flats/[id] page → fills room form (name + max_capacity)
  │
  ▼
Frontend: POST /api/flats/:flatId/rooms
  Body: { name: "Room 101", max_capacity: 3 }
  │
  ▼
Backend: validate + check flat exists
  │
  ├── Flat not found → 404 { error: { code: "FLAT_NOT_FOUND", message: "..." } }
  │
  └── PASS → Prisma: room.create({ data: { name, max_capacity, flat_id: flatId } })
                └── 201 { success: true, data: { id, name, max_capacity, flat_id } }
```

---

### Flow 3: Creating a Bed (Capacity Check)

```
User on room page → clicks "Add Bed" → fills label field
  │
  ▼
Frontend: POST /api/rooms/:roomId/beds
  Body: { label: "Bed A" }
  │
  ▼
Backend:
  1. Find room (check it exists)
  2. Count existing beds: SELECT COUNT(*) FROM beds WHERE room_id = roomId
  3. If count >= room.max_capacity → 
       409 { error: { code: "ROOM_AT_CAPACITY", 
                      message: "Room is at maximum capacity (3 beds)." } }
  4. PASS → Prisma: bed.create({ data: { label, room_id: roomId, status: "available" } })
  5. 201 { success: true, data: { id, label, status: "available", room_id } }
```

> **Key learning:** Step 2–3 is the capacity enforcement. This runs on the backend regardless of what the frontend shows.

---

### Flow 4: Assigning a Tenant to a Bed (Most Complex Flow)

```
User selects tenant + selects bed → clicks "Assign"
  │
  ▼
Frontend: POST /api/assignments
  Body: { tenant_id: "uuid-1", bed_id: "uuid-2" }
  │
  ▼
Backend (ALL of this runs in a Prisma transaction):
  
  STEP 1: Find the bed
    - If not found → 404 BED_NOT_FOUND
  
  STEP 2: Check bed status
    - If status === "occupied"         → 409 BED_OCCUPIED
    - If status === "under_maintenance" → 409 BED_UNDER_MAINTENANCE
  
  STEP 3: Check tenant has no active assignment
    - SELECT * FROM tenant_assignments 
      WHERE tenant_id = tenantId AND is_active = true
    - If found → 409 TENANT_ALREADY_ASSIGNED
  
  STEP 4 (inside transaction):
    a. Create assignment: { tenant_id, bed_id, is_active: true, assigned_at: now }
    b. Update bed status to "occupied"
  
  STEP 5: Return 201 with assignment data
  
  If ANY step fails → entire transaction rolls back (nothing is saved)
```

---

### Flow 5: Moving a Tenant to a Different Bed

```
User clicks "Move Tenant" on existing assignment → selects new bed
  │
  ▼
Frontend: PATCH /api/assignments/:id/move
  Body: { new_bed_id: "uuid-new" }
  │
  ▼
Backend (Prisma transaction):
  
  STEP 1: Find current active assignment
    - If not found → 404 ASSIGNMENT_NOT_FOUND
  
  STEP 2: Find new bed
    - If not found → 404 BED_NOT_FOUND
    - If status !== "available" → 409 (BED_OCCUPIED or BED_UNDER_MAINTENANCE)
  
  STEP 3 (inside transaction):
    a. Update OLD bed status → "available"
    b. Update current assignment: is_active = false
    c. Create NEW assignment: { tenant_id, new_bed_id, is_active: true }
    d. Update NEW bed status → "occupied"
  
  STEP 4: Return 200 with new assignment
```

> **Why is this a transaction?** If step 3a succeeds (old bed freed) but 3c fails (new assignment not created), you'd have a tenant with no active assignment and the old bed showing as available — data corruption. Transactions guarantee all-or-nothing.

---

### Flow 6: Deleting a Flat (Warning + Confirm)

```
User clicks "Delete" on a flat
  │
  ▼
Frontend: GET /api/flats/:id to count active assignments
  │
  ├── 0 active assignments → Show simple confirm dialog
  │     "Are you sure you want to delete Sunrise Apartments?"
  │
  └── N active assignments → Show WARNING dialog
        "⚠ Sunrise Apartments has 4 active tenant assignments.
         Deleting this flat will unassign all tenants and remove
         all rooms and beds. This cannot be undone.
         Type 'DELETE' to confirm."
  
User confirms → Frontend: DELETE /api/flats/:id
  │
  ▼
Backend:
  STEP 1: Find all beds in this flat (via rooms)
  STEP 2: Check for any active assignments on those beds
  STEP 3: If found → 409 FLAT_HAS_ACTIVE_ASSIGNMENTS (safety net if UI bypassed)
  STEP 4: Delete all assignments (soft: is_active = false) → beds → rooms → flat
  
  Note: The assignment says "require explicit confirmation" — we interpret this as
  the backend still REFUSING deletion if assignments exist. The frontend warns,
  but the backend is the enforcer. The "explicit confirmation" is a UI warning.
```

> **Interpretation note:** The assignment says to warn and require confirmation. The safest reading: backend refuses deletion if assignments exist. Frontend shows warning so admin knows to unassign tenants first. This is the stricter, more correct interpretation.

---

### Flow 7: Dashboard

```
User visits / (dashboard)
  │
  ▼
Frontend: GET /api/dashboard
  │
  ▼
Backend query (optimized — single round trip):
  For each flat:
    - Count total beds
    - Count beds with status = "occupied"
    - Calculate occupancy percentage
    - For each room in the flat:
        - Same counts at room level
  
  Returns:
  {
    "success": true,
    "data": [
      {
        "flat": { "id": "...", "name": "Sunrise Apartments" },
        "total_beds": 10,
        "occupied_beds": 8,
        "occupancy_percent": 80,
        "rooms": [
          {
            "room": { "id": "...", "name": "Room 101" },
            "total_beds": 3,
            "occupied_beds": 2,
            "occupancy_percent": 67
          }
        ]
      }
    ]
  }
```

---

## 3. Frontend State Management

### What TanStack Query handles (server state)
- Fetching data from the API
- Caching responses
- Showing loading/error states
- Refetching after mutations

### What React useState handles (local state)
- Form input values
- Dialog open/close
- Selected items in dropdowns

### Pattern for every data operation:
```javascript
// Reading data
const { data, isLoading, error } = useQuery({
  queryKey: ['flats'],           // cache key — must be unique
  queryFn: () => api.getFlats()  // function that returns a promise
});

// Writing data (create/update/delete)
const mutation = useMutation({
  mutationFn: (data) => api.createFlat(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['flats'] }); // refresh list
    toast.success('Flat created!');
  },
  onError: (error) => {
    toast.error(error.response?.data?.error?.message || 'Something went wrong');
  }
});
```

---

## 4. Error Handling Flow

### Backend
```javascript
// controllers always throw custom errors with codes
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Global error handler middleware catches everything
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong'
    }
  });
});
```

### Frontend
```javascript
// All API errors surface through TanStack Query's onError
// The error object is the Axios error
// error.response.data.error.message = your custom message from backend
```

---

## 5. Build Order (Phases)

Build in this exact order — each phase is testable on its own:

```
Phase 1: Project Setup
  ├── Create monorepo folder structure
  ├── Initialize backend (npm init, install deps, .gitignore)
  └── Initialize frontend (create-next-app)

Phase 2: Database Setup
  ├── Create Supabase project
  ├── Write Prisma schema (all 5 models)
  └── Run first migration

Phase 3: Backend Core
  ├── Express app setup (index.js, middleware, error handler)
  └── Prisma client singleton

Phase 4: Flats API
  ├── Routes + Controller + Validation
  └── Test with curl / Postman

Phase 5: Rooms API
  ├── Routes + Controller + Validation
  └── Test capacity enforcement

Phase 6: Beds API
  ├── Routes + Controller
  └── Test status logic

Phase 7: Tenants + Assignments API
  ├── Tenant CRUD
  ├── Assignment creation (with transaction)
  └── Move tenant (with transaction)

Phase 8: Dashboard API
  └── Occupancy aggregation query

Phase 9: Frontend Foundation
  ├── Next.js layout + navigation
  ├── Axios instance + API functions
  └── TanStack Query setup

Phase 10: Frontend Pages
  ├── Dashboard page
  ├── Flats list + detail
  ├── Room detail with beds
  └── Tenants page

Phase 11: Deployment
  ├── Deploy backend to Render
  ├── Deploy frontend to Vercel
  └── Update env vars for production

Phase 12: README + Polish
  └── Write README.md with setup instructions + live links
```

---

## 6. Folder Structure (Final Reference)

```
bedr-admin/
├── README.md                       ← Project overview + setup + live links
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.js
│   │   ├── lib/
│   │   │   └── prisma.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── validate.js
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
│   ├── .env                        ← Never commit
│   ├── .env.example                ← Commit this
│   ├── .gitignore
│   └── package.json
└── frontend/
    ├── app/
    │   ├── layout.js
    │   ├── page.js                 ← Dashboard
    │   ├── flats/
    │   │   ├── page.js
    │   │   └── [id]/
    │   │       ├── page.js
    │   │       └── rooms/
    │   │           └── [roomId]/
    │   │               └── page.js
    │   └── tenants/
    │       ├── page.js
    │       └── [id]/
    │           └── page.js
    ├── components/
    │   ├── ui/                     ← shadcn components
    │   ├── Navbar.jsx
    │   ├── BedStatusBadge.jsx
    │   ├── OccupancyBar.jsx
    │   └── ConfirmDialog.jsx
    ├── lib/
    │   ├── api.js
    │   └── queryClient.js
    ├── .env.local                  ← Never commit
    ├── .env.local.example          ← Commit this
    ├── next.config.js
    ├── tailwind.config.js
    └── package.json
```
