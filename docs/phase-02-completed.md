# Phase 2 — Dashboard & Activity Log ✅

**Completed:** 2025-05-02

---

## What was built

### Sidebar Navigation
- `src/components/app-sidebar.tsx` — Server component with user avatar, sign out, theme toggle
- `src/components/sidebar-nav.tsx` — Client component with `usePathname()` for active state highlighting
- Links: Dashboard, Users, Certifications, Banners, Legal Texts, Activity Log, Settings

### Dashboard (`src/app/(dashboard)/page.tsx`)
- Stats cards: Total Users, Resources, Last Sync (from DB)
- Recent Activity section (latest 5 from DB, empty state when no data)
- "View all" button links to dedicated activity page

### Activity Log Page (`src/app/(dashboard)/activity/page.tsx`)
- Full activity list with timestamp, admin name, action, entity
- Entity type filter buttons (All, System, Users, Certifications, Banners, Legal Texts, Assignments)
- Pagination (prev/next) with 20 items per page

### Activity Log Helper (`src/lib/activity.ts`)
- `logActivity()` — writes entries from server actions (captures current admin from session)
- `getRecentActivity()` — fetches latest N entries for dashboard
- `getActivityLog()` — paginated + filtered list for activity page
- `ActivityWithUser` type exported for type-safe usage

### Theme Support
- `next-themes` with dark/light toggle in sidebar
- `ThemeProvider` wrapping app in root layout
- `defaultTheme: "dark"`, `enableSystem` for OS preference

### Key Fixes
- Prisma 7.8 requires `@prisma/adapter-pg` driver adapter
- Import from `@/generated/prisma/client` (no barrel index.ts in generated dir)
