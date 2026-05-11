<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Also here is the complete application we're going to build

---

# 🧠 BSS Signature App — Vibe Coding Guide

> A phase-wise execution plan to build the **bss_sig email signature management system** with Microsoft integration.

---

## 🚀 Overview

This app allows:

* Admin login via Microsoft
* Syncing users from Microsoft Graph
* Managing signature resources (certifications, banners, legal text)
* Assigning resources via rules (global, country, etc.)
* Generating dynamic email signatures
* Integrating with Outlook Add-in

---

## 🧩 Tech Stack

* **Framework**: Next.js 16 (App Router)
* **Auth**: Auth.js (Microsoft Entra ID)
* **DB**: PostgreSQL + Prisma
* **UI**: Tailwind + shadcn/ui
* **Editor**: Tiptap (or Quill)
* **API Security**: JWT verification via Azure
* **Office Integration**: Outlook Add-in

---

## 📦 Phase Breakdown

---

## 🧱 Phase 1 — Scaffold & Auth

**Goal:** Secure app with Microsoft login

### Tasks:

* Setup Next.js with:

  * TypeScript + Tailwind + shadcn
  * Neutral dark theme (zinc/neutral)

* Configure Auth.js:

  * Microsoft Entra ID provider
  * Restrict login via `ADMIN_EMAILS`

* Pages:

  * `/login`
  * Middleware to protect routes

* Setup DB:

  * Tables: `users`, `activity_log`, `sync_meta`

### ✅ Deliverable:

Login → Dashboard works

---

## 📊 Phase 2 — Dashboard & Activity Log

**Goal:** App shell + activity tracking

### Features:

* Sidebar navigation

* Dashboard:

  * Stats (users, resources, last sync)
  * Recent activity

* Activity log:

  * timestamp, admin, action, entity

* Pagination + filters

### ✅ Deliverable:

Working dashboard + logs

---

## 👥 Phase 3 — User Sync

**Goal:** Sync Microsoft users

### DB:

* `ms_users`
* `job_titles`

### Features:

* Sync from Microsoft Graph (`/users`)

* Store:

  * email, name, job title, department, etc.

* Pages:

  * Users list
  * User profile
  * Signature preview (`iframe`)

### ✅ Deliverable:

Users synced + visible + signature preview

---

## 🧾 Phase 4 — Resources

**Goal:** Manage signature content

### Tables:

* `certifications`
* `banners`
* `legal_texts`

### Features:

* CRUD UI
* Image upload (base64)
* Banner date control
* Rich text editor

### ✅ Deliverable:

Full resource management

---

## ⚙️ Phase 5 — Assignment Engine (CORE)

### ⚠️ Key Logic (Corrected)

> This is **NOT priority-based**, it’s **OR + deduplication**

### Rules:

1. Combine:

   * Global
   * Country
   * Job Title
   * Group

2. Use **UNION (OR logic)**

3. Remove duplicates

4. **User override replaces EVERYTHING**

---

### Example:

* Global → cert1
* India → cert2

👉 Indian user gets: `cert1 + cert2`

👉 Others get: `cert1`

---

### Deduplication:

If admin adds same cert multiple times → show only once

---

### DB:

* `assignments`
* `user_overrides`

---

### UI:

* Rule builder:

  * Select scope
  * Pick resources
  * Save rule

* User profile:

  * “Why this signature?” explanation

* Override:

  * "Customized" badge
  * "Restore defaults"

---

### 🧠 Resolution Logic

```ts
// Simplified logic
if (userOverrideExists) {
  return overrideResources;
}

const rules = getMatchingRules(user);

const certs = dedupe(allCertsFromRules);
const banners = dedupe(allBannersFromRules);
const legal = dedupe(allLegalFromRules);

return buildSignature(user, certs, banners, legal);
```

---

### ✅ Deliverable:

Fully working rule engine

---

## 🌍 Phase 6 — Country Config

### Table:

* `country_config`

### Features:

* Map:

  * Country → Company Name + Website

### Fallback:

```
Blackstone Shipping Private Limited
```

---

### ✅ Deliverable:

Country-specific branding

---

## 🔌 Phase 7 — API + Outlook Add-in

---

### 🔐 Signature API

```
GET /api/signature?email=
```

### Steps:

1. Verify Azure token
2. Resolve signature
3. Return HTML

---

### 📧 Outlook Add-in

#### Taskpane:

* Fetch signature
* Insert into email:

```js
Office.context.mailbox.item.body.setSignatureAsync(html)
```

#### Ribbon Button:

* “Refresh Signature”

---

### 📄 Manifest Files

* local
* staging
* production

---

### ✅ Deliverable:

Working Outlook integration

---

## 🧼 Phase 8 — Polish

* SSG + caching
* Skeleton loaders
* Error handling
* Accessibility
* Docker setup

---

## 🔐 Azure Setup (IMPORTANT)

---

### 🧾 App Registration

Use **ONE app** for:

* Login
* API validation

---

### 🔑 Permissions (Delegated)

| Permission           | Purpose          |
| -------------------- | ---------------- |
| User.Read.All        | Read users       |
| Group.Read.All       | Read groups      |
| GroupMember.Read.All | Group membership |
| openid               | Login            |
| profile              | Profile info     |
| email                | Email            |
| offline_access       | Refresh tokens   |

👉 **Admin consent required**

---

### 🔐 Expose API

* Add scope: `access_as_user`
* Used by Outlook Add-in

---

### 🔁 Tokens Used

| Token        | Purpose     |
| ------------ | ----------- |
| ID Token     | Login       |
| Access Token | API calls   |
| Office Token | Add-in auth |

---

## 🧠 Key Takeaways

* Assignment logic = **OR + dedupe**
* User override = **absolute priority**
* Avoid duplicates ALWAYS
* Azure setup is critical for auth + API
* Build phases in order (Phase 5 depends on 3 & 4)

---

