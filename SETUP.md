# BSS Signature App — Setup Guide

A web application for managing and generating dynamic Microsoft Outlook email signatures, with Microsoft Entra ID (Azure AD) login and user sync.

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | 20+ | LTS recommended |
| [PostgreSQL](https://www.postgresql.org/) | 14+ | Local or cloud (e.g. [Neon](https://neon.tech)) |
| Microsoft 365 tenant | — | Required for Azure AD login and user sync |
| Microsoft admin account | — | Needed to register the Azure AD app |

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and fill in each variable as described in the sections below.

### 2a. Database

```env
DATABASE_URL="postgresql://user:password@localhost:5432/bss-sig"
```

Replace `user`, `password`, and `bss-sig` with your PostgreSQL credentials and desired database name. For a cloud database (e.g. Neon), use the connection string provided by the service with `?sslmode=require` appended.

### 2b. Auth Secret

Generate a random secret and paste it in:

```bash
openssl rand -base64 32
```

```env
AUTH_SECRET="paste-generated-value-here"
```

---

## 3. Azure AD Setup

You need a **Microsoft Entra ID (Azure AD) App Registration**. You must be a Microsoft 365 administrator to complete these steps.

### Step 1 — Register the Application

1. Go to [portal.azure.com](https://portal.azure.com) and sign in with your admin account.
2. Search for **"Microsoft Entra ID"** in the top search bar.
3. In the left sidebar click **App registrations** → **New registration**.
4. Fill in the form:
   - **Name**: `BSS Signature App` (or any name you prefer)
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**: Select **Web** and enter:
     ```
     http://localhost:3000/api/auth/callback/microsoft-entra-id
     ```
     (Add your production URL here too when deploying, e.g. `https://your-domain.com/api/auth/callback/microsoft-entra-id`)
5. Click **Register**.

### Step 2 — Copy the IDs

After registration you will land on the app overview page. Copy:

- **Application (client) ID** → this is `AZURE_AD_CLIENT_ID`
- **Directory (tenant) ID** → this is `AZURE_AD_TENANT_ID`

```env
AZURE_AD_CLIENT_ID="paste-application-client-id-here"
AZURE_AD_TENANT_ID="paste-directory-tenant-id-here"
```

### Step 3 — Create a Client Secret

1. In the left sidebar click **Certificates & secrets** → **New client secret**.
2. Add a description (e.g. `bss-sig-secret`) and choose an expiry period.
3. Click **Add**.
4. **Copy the secret Value immediately** — it is only shown once.

```env
AZURE_AD_CLIENT_SECRET="paste-secret-value-here"
```

### Step 4 — Set the App URI (for Outlook Add-in API)

1. In the left sidebar click **Expose an API**.
2. Next to **Application ID URI** click **Add** (or **Edit**).
3. Set it to:
   ```
   api://your-app-domain/your-application-client-id
   ```
   Example:
   ```
   api://bss-www-sig.vercel.app/13fd73e4-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
   For local development you can use:
   ```
   api://localhost:3000/your-application-client-id
   ```
4. Click **Save**.

```env
AZURE_AD_APP_URI="api://your-app-domain/your-application-client-id"
```

### Step 5 — Grant API Permissions

1. In the left sidebar click **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**.
2. Search for and add the following permissions:

   | Permission | Purpose |
   |---|---|
   | `User.Read.All` | Read all users for sync |
   | `Group.Read.All` | Read groups |
   | `GroupMember.Read.All` | Read group memberships |
   | `openid` | Login |
   | `profile` | User profile info |
   | `email` | User email |
   | `offline_access` | Refresh tokens |

3. Click **Grant admin consent for [your organization]** and confirm.

### Step 6 — Configure Token Settings (optional but recommended)

1. In the left sidebar click **Token configuration** → **Add optional claim**.
2. Select **ID token** and add: `email`, `upn`, `given_name`, `family_name`.
3. Click **Add**.

---

## 4. Access Control

Only Microsoft accounts listed in `ADMIN_EMAILS` are allowed to log in to the application. Add a comma-separated list of email addresses:

```env
ADMIN_EMAILS="admin@yourcompany.com,another.admin@yourcompany.com"
```

These must be valid accounts in your Microsoft 365 tenant.

---

## 5. Root (Break-glass) Login

A special `/root` login page exists for developer access **without a Microsoft account**. This is useful for:

- Initial setup and testing before Azure AD is configured
- Assisting the client with onboarding

```env
ROOT_USER_EMAIL="developer@example.com"
ROOT_USER_PASS="choose-a-strong-password"
```

Access it at: `http://localhost:3000/root`

> **Security note:** Use a strong password. This login bypasses Microsoft authentication entirely. Do not share these credentials with end users.

---

## 6. Signature API Auth Flag

```env
# Development only — skip JWT verification on the public signature API
SKIP_SIGNATURE_AUTH=true

# Production — must be false or removed
SKIP_SIGNATURE_AUTH=false
```

Set this to `true` only during local development when you want to call the signature API without a valid Office/Azure token.

---

## 7. Outlook Add-in Manifest

The add-in manifest tells Outlook where to load the taskpane and how to authenticate. A sanitised template is provided to get you started:

```
public/example/manifest.xml  ← start here
```

### How to create your manifest

1. Copy the template:
   ```bash
   cp public/example/manifest.xml public/local/manifest.xml
   ```
2. Replace the three placeholders inside the file:

   | Placeholder | What to put |
   |---|---|
   | `YOUR_ADDIN_GUID` | A new unique GUID — generate one at [guidgenerator.com](https://guidgenerator.com). Use a **different** GUID per environment. |
   | `YOUR_APP_DOMAIN` | Hostname of your deployed app, e.g. `localhost:3000` for local, `yourcompany.com` for production. No trailing slash, no `https://` in this field (the template already adds it). |
   | `YOUR_AZURE_AD_CLIENT_ID` | The Application (client) ID from your Azure AD App Registration (same value as `AZURE_AD_CLIENT_ID` in `.env`). |

3. The `<Resource>` tag in `WebApplicationInfo` must match `AZURE_AD_APP_URI` in your `.env`:
   ```xml
   <Resource>api://YOUR_APP_DOMAIN/YOUR_AZURE_AD_CLIENT_ID</Resource>
   ```

### Sideloading the add-in in Outlook

1. In Outlook (desktop), go to **Home → Get Add-ins → My Add-ins → Add a custom add-in → Add from file**.
2. Select your completed `manifest.xml`.
3. Compose a new email — the **BSS Signature** group will appear in the ribbon.

> For Outlook on the Web: Settings → Integrated apps → Upload custom app → upload the XML.

---

## 8. Database Setup

Run Prisma migrations to create all tables:

```bash
npx prisma migrate dev
```

To inspect the database with Prisma Studio:

```bash
npx prisma studio
```

---

## 9. Running the App

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

The `build` command runs `prisma generate` automatically before compiling Next.js.

---

## 10. Project Structure (quick reference)

```
bss-www-sig/
├── prisma/
│   └── schema.prisma            # Database schema
├── public/
│   └── example/manifest.xml     # Manifest template — copy and fill placeholders
├── src/
│   ├── app/                     # Next.js App Router pages & API routes
│   ├── components/              # Shared UI components
│   ├── generated/prisma/        # Auto-generated Prisma client (do not edit)
│   └── lib/                     # Auth config, DB client, utilities
├── .env.example                 # Environment variable template (safe to share)
├── .env                         # Your local secrets — never share or commit
└── SETUP.md                     # This file
```

---

## 11. Environment Variables — Full Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret for Auth.js session encryption |
| `AZURE_AD_CLIENT_ID` | Yes | Azure app registration — Application (client) ID |
| `AZURE_AD_CLIENT_SECRET` | Yes | Azure app registration — client secret value |
| `AZURE_AD_TENANT_ID` | Yes | Azure app registration — Directory (tenant) ID |
| `AZURE_AD_APP_URI` | Yes | Azure app URI for Outlook Add-in token validation |
| `ADMIN_EMAILS` | Yes | Comma-separated list of emails allowed to log in |
| `SKIP_SIGNATURE_AUTH` | No | `true` to skip API token check (dev only) |
| `ROOT_USER_EMAIL` | Yes | Email for the `/root` developer login |
| `ROOT_USER_PASS` | Yes | Password for the `/root` developer login |

---

## 12. Common Issues

**Login fails / redirect error**
- Verify the Redirect URI in Azure matches exactly (including trailing slash if any).
- Ensure your email is in `ADMIN_EMAILS`.

**"User not found" after login**
- Prisma tables may not be created — run `npx prisma migrate dev`.

**Microsoft Graph sync returns no users**
- Confirm `User.Read.All` and `Group.Read.All` permissions have admin consent granted.

**Signature API returns 401**
- Set `SKIP_SIGNATURE_AUTH=true` in development, or provide a valid Azure token in the `Authorization` header.
