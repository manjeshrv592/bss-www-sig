# Phase 1 — Scaffold & Auth ✅

**Completed:** 2025-05-02

---

## What was built

### Next.js Setup
- Next.js 16.2.4 with App Router + Turbopack
- `basePath: "/bss-sig"` in `next.config.ts`
- TypeScript + Tailwind CSS v4 + shadcn/ui (radix-nova style, neutral base)
- Poppins font (300–700 weights) via `next/font/google`
- Dark/light theme support with `next-themes` + theme toggle in sidebar

### Authentication (Auth.js + Microsoft Entra ID)
- `src/lib/auth.ts` — NextAuth v5 config with Microsoft Entra ID provider
- OIDC scopes: `openid profile email User.Read.All Group.Read.All GroupMember.Read.All offline_access`
- Admin restriction via `ADMIN_EMAILS` env var (comma-separated)
- JWT session strategy with access token forwarding
- `src/app/api/auth/[...nextauth]/route.ts` — Auth API route with basePath workaround (re-adds `/bss-sig` prefix stripped by Next.js)

### Route Protection
- `src/proxy.ts` — Next.js 16 proxy (replaces deprecated `middleware.ts`)
- Redirects unauthenticated users to `/bss-sig/login`
- Allows `/api/auth` and `/login` routes through

### Database (Prisma + PostgreSQL)
- `prisma/schema.prisma` with 3 models:
  - `User` (id, email, name, image, role)
  - `ActivityLog` (userId, action, entity, entityId, details)
  - `SyncMeta` (syncType, lastSync, status, details)
- `src/lib/prisma.ts` — Singleton Prisma client
- `prisma.config.ts` — Prisma config referencing `DATABASE_URL`

### Pages
- **Login** (`src/app/login/page.tsx`) — Microsoft sign-in button with MS logo SVG, card layout
- **Dashboard** (`src/app/(dashboard)/page.tsx`) — Stats cards (users, resources, last sync) + recent activity list with dummy data + "View all" link
- **Dashboard Layout** (`src/app/(dashboard)/layout.tsx`) — Sidebar + content area, auth guard

### Components
- `src/components/app-sidebar.tsx` — Sidebar with nav links, user avatar, sign out, theme toggle
- `src/components/theme-provider.tsx` — next-themes wrapper
- `src/components/theme-toggle.tsx` — Sun/moon toggle button
- shadcn/ui components: button, card, separator, avatar, tooltip

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session encryption key |
| `AUTH_URL` | Full app URL including basePath (e.g. `http://localhost:3000/bss-sig`) |
| `AZURE_AD_CLIENT_ID` | Azure app registration client ID |
| `AZURE_AD_CLIENT_SECRET` | Azure app registration client secret |
| `AZURE_AD_TENANT_ID` | Azure directory (tenant) ID |
| `ADMIN_EMAILS` | Comma-separated list of allowed admin emails |

---

## Azure App Registration

- **Redirect URI:** `http://localhost:3000/bss-sig/api/auth/callback/microsoft-entra-id`
- **Permissions (Delegated):** openid, profile, email, offline_access, User.Read.All, Group.Read.All, GroupMember.Read.All
- **Admin consent:** Granted for all permissions

---

## Key Decisions / Gotchas

1. **Next.js 16 uses `proxy.ts` not `middleware.ts`** — renamed convention, exports `proxy()` function
2. **basePath + next-auth conflict** — Next.js strips basePath from route handler requests, but next-auth needs full path. Fixed with `withBasePath` wrapper in route handler
3. **Redirects split:** `next/navigation` `redirect()` and `Link` auto-prepend basePath; `signIn`/`signOut` `redirectTo` and `new URL()` in proxy need explicit `/bss-sig` prefix
4. **Poppins is not a variable font** — requires explicit weight array
5. **`AUTH_URL` env var** — needed so next-auth generates correct OAuth callback URLs with basePath
