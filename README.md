# Spec-Driven Scalable Core Architecture

A production-ready, minimal yet scalable boilerplate featuring **Spec-Driven Development (SDD)**, end-to-end type safety, JWT authentication with token rotation, granular Role-Based Access Control (RBAC), accessible UI component primitives, and atomic state management.

---

## 🌟 Key Highlights & Philosophy

- **Spec-Driven First**: [spec/openapi.yaml](spec/openapi.yaml) is the single source of truth. Types, routes, validation, and documentation are strictly driven by the OpenAPI 3.1 specification.
- **Minimal Yet Scalable**: Built with standard TypeScript, Express, Prisma, React, and Vite. Zero heavyweight frameworks or vendor lock-in.
- **Enterprise-Grade Auth & RBAC**:
  - Stateless short-lived Access Tokens (15m) + rotatable, revocable Refresh Tokens (7d).
  - Role hierarchy: `ADMIN` > `MANAGER` > `USER` with fine-grained permission resolution (`users:read`, `users:write`, `analytics:read`).
- **Resilient Frontend State**: Zustand store with localStorage token persistence + Axios interceptors that automatically catch `401 Unauthorized`, refresh tokens behind the scenes, and transparently replay failed requests.
- **Production UI System**: Tailwind CSS design system with reusable primitives (Buttons, Inputs, Cards, Badges, Modals, Alerts).
- **Interactive Documentation**: Swagger UI automatically hosted at `http://localhost:4000/docs`.

---

## 🏗️ Architecture & Directory Structure

```
rippedZip/
├── spec/
│   ├── openapi.yaml           # OpenAPI 3.1 Contract (Single Source of Truth)
│   └── workflow.md            # Team SDD guidelines and workflow runbook
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (User, RefreshToken)
│   │   ├── seed.ts            # Seed script for Admin, Manager, and User
│   │   └── dev.db             # SQLite database (zero-dependency local setup)
│   ├── src/
│   │   ├── config/            # Env schema (Zod) & RBAC permission matrix
│   │   ├── db/                # Prisma client singleton
│   │   ├── middleware/        # JWT auth, RBAC authorization, Zod validation, error handler
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication routes, controllers, and services
│   │   │   ├── users/         # User management and role modification
│   │   │   └── dashboard/     # System metrics and role distribution
│   │   ├── types/             # Generated OpenAPI contract types
│   │   ├── utils/             # Password hasher (bcryptjs), JWT signer
│   │   ├── app.ts             # Express application & Swagger UI setup
│   │   └── server.ts          # Server entrypoint and graceful shutdown
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client with 401 refresh interceptors
│   │   ├── components/
│   │   │   ├── auth/          # ProtectedRoute & RoleGuard wrappers
│   │   │   ├── layout/        # Navbar and AppLayout
│   │   │   └── ui/            # UI Primitives: Button, Card, Badge, Modal, Input, Alert
│   │   ├── pages/             # Login, Register, Dashboard, Users (RBAC), Unauthorized
│   │   ├── stores/            # Zustand auth state store
│   │   ├── types/             # Generated OpenAPI contract types & friendly re-exports
│   │   ├── App.tsx            # React Router v6 tree
│   │   └── main.tsx           # Client entrypoint
│   └── package.json
└── package.json               # Root monorepo workspace orchestration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher

### 2. Setup Database & Seed Accounts
Run the database sync and seed script:
```bash
npm run db:push
npm run db:seed
```

### 3. Generate Contract Types
Generate TypeScript types for frontend and backend directly from `spec/openapi.yaml`:
```bash
npm run codegen
```

### 4. Run Development Servers
Start both backend and frontend concurrently:
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **Swagger UI Interactive Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **Health Check**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 🔑 Pre-seeded Test Accounts

The seed script (`backend/prisma/seed.ts`) provisions three accounts for testing the RBAC flow:

| Role | Email | Password | Permissions | Accessible Pages |
| :--- | :--- | :--- | :--- | :--- |
| **`ADMIN`** | `admin@example.com` | `AdminPass123!` | Full Superuser | Dashboard, User Roster, Role Editor |
| **`MANAGER`** | `manager@example.com` | `ManagerPass123!` | `users:read`, `analytics:read` | Dashboard, User Roster (Read-Only) |
| **`USER`** | `user@example.com` | `UserPass123!` | `profile:read`, `profile:write` | Dashboard (Roster blocked by guard) |

> 💡 *Tip: The Login page includes 1-click quick-fill buttons for each of these test accounts!*

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

$$\text{ADMIN} \supset \text{MANAGER} \supset \text{USER}$$

```typescript
// backend/src/config/rbac.ts
export const ROLE_PERMISSIONS = {
  ADMIN: ['users:read', 'users:write', 'analytics:read', 'system:admin', 'profile:read', 'profile:write'],
  MANAGER: ['users:read', 'analytics:read', 'profile:read', 'profile:write'],
  USER: ['profile:read', 'profile:write', 'analytics:read'],
};
```

### Route Guard Usage
**On the Backend:**
```typescript
router.patch(
  '/:id/role',
  authenticate,
  authorize('ADMIN'),
  requirePermission('users:write'),
  validate({ body: updateUserRoleSchema }),
  userController.updateRole
);
```

**On the Frontend:**
```tsx
<Route
  path="/users"
  element={
    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} requiredPermission="users:read">
      <UsersPage />
    </ProtectedRoute>
  }
/>
```

---

## 🔄 Spec-Driven Development (SDD) Workflow

1. **Contract First**: Any new API route or field modification is drafted in `spec/openapi.yaml`.
2. **Type Generation**: Run `npm run codegen`. This regenerates:
   - `frontend/src/types/api.generated.ts`
   - `backend/src/types/api.generated.ts`
3. **Backend Route & Validation**: Create a Zod schema in `backend/src/modules/<domain>/` mirroring the spec parameters and attach the `validate({ body, query, params })` middleware.
4. **Frontend Integration**: Consume the typed API client with full autocomplete and compile-time type safety.
5. **Interactive Verification**: Visit `http://localhost:4000/docs` to test payloads live.

---

## 🗄️ Database Switching (SQLite to PostgreSQL)

To switch to PostgreSQL in production:
1. Change `provider = "sqlite"` to `provider = "postgresql"` in `backend/prisma/schema.prisma`.
2. Update `DATABASE_URL` in `backend/.env` with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
   ```
3. Run `npm run db:push`.
