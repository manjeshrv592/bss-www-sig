# BSS Signature — Azure Setup Guide

This guide walks through configuring Microsoft Azure for the BSS Signature app. Follow these steps for each new client/tenant.

---

## 1. App Registration

1. Go to **Azure Portal** → **Microsoft Entra ID** → **App registrations**
2. Click **+ New registration**
3. Fill in:
   - **Name**: `BSS Signature`
   - **Supported account types**: Accounts in this organizational directory only (Single tenant)
   - **Redirect URI**: Web → `https://<YOUR_DOMAIN>/api/auth/callback/microsoft-entra-id`
<!-- https://blackstone.simtechitsolutions.in:8123/api/auth/callback/microsoft-entra-id -->

4. Click **Register**
5. Note down:
   - **Application (client) ID** → used as `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → used as `AZURE_AD_TENANT_ID`

---

## 2. Client Secret

1. Go to **Certificates & secrets** → **Client secrets**
2. Click **+ New client secret**
3. Set a description (e.g. `bss-sig-secret`) and expiry
4. Click **Add**
5. **Copy the Value immediately** — it won't be shown again
6. This is your `AZURE_AD_CLIENT_SECRET`

---

## 3. Authentication — Redirect URIs

Go to **Authentication** → **Web** → **Redirect URIs**

Add all environments that apply:

```
http://localhost:3000/api/auth/callback/microsoft-entra-id
https://<STAGING_URL>/api/auth/callback/microsoft-entra-id
https://<PRODUCTION_URL>/api/auth/callback/microsoft-entra-id
```
<!-- https://blackstone.simtechitsolutions.in:8123/api/auth/callback/microsoft-entra-id -->

Under **Implicit grant and hybrid flows**:
- ✅ ID tokens
- ❌ Access tokens

---

## 4. API Permissions

Go to **API permissions** → **+ Add a permission** → **Microsoft Graph**

### Delegated Permissions

| Permission | Purpose |
|---|---|
| `openid` | Required for login (OpenID Connect) |
| `profile` | Get user name/info during login |

### Application Permissions

| Permission | Purpose |
|---|---|
| `User.Read.All` | Sync all users from the organization |
| `Group.Read.All` | Sync all groups from the organization |
| `GroupMember.Read.All` | Read group memberships for assignment rules |

### Grant Admin Consent

After adding all permissions, click **"Grant admin consent for [Organization]"**.

> ⚠️ Application permissions will NOT work without admin consent.

### Permissions to Remove (if present)

Remove any previously added delegated versions of:
- `User.Read.All` (delegated)
- `Group.Read.All` (delegated)
- `GroupMember.Read.All` (delegated)
- `email`
- `offline_access`

---

## 5. Expose an API

Go to **Expose an API**

### Application ID URI

You need **two** Application ID URIs — one per deployment domain. Click **Add a scope** to configure:

```
api://<YOUR_DOMAIN>/<APPLICATION_CLIENT_ID>
```

Examples:
- Staging: `api://bss-www-sig.vercel.app/<CLIENT_ID>`
- Production: `api://blackstone.simtechitsolutions.in/80c4e4bb-8b7f-4a99-8364-ee587b08670d`

> ⚠️ The URI must match the `<Resource>` value in the manifest file exactly.

### Add a Scope

Click **+ Add a scope** and fill in:

| Field | Value |
|---|---|
| Scope name | `access_as_user` |
| Who can consent | Admins and users |
| Admin consent display name | `Access BSS Signature as user` |
| Admin consent description | `Allow Office to call BSS Signature API on behalf of the signed-in user` |
| User consent display name | `Access BSS Signature` |
| User consent description | `Allow Office to access your email signature on your behalf` |
| State | Enabled |

### Authorized Client Applications

Scroll down to **Authorized client applications** → **+ Add a client application**

For each Client ID below, check the `access_as_user` scope and click **Add application**:

| Client ID | Application |
|---|---|
| `ea5a67f6-b6f3-4338-b240-c655ddc3cc8e` | Microsoft 365 desktop/mobile |
| `d3590ed6-52b3-4102-aeff-aad2292ab01c` | Microsoft Office desktop |
| `57fb890c-0dab-4253-a5e0-7188c88b2bb4` | Office on the web |
| `08e18876-6177-487e-b8b5-cf950c1e598c` | Office on the web (alternate) |
| `bc59ab01-8403-45c6-8796-ac3ef710b3e3` | Outlook on the web |
| `93d53678-613d-4013-afc1-62e9e444a0a5` | Office on the web (another) |

> These are Microsoft's fixed client IDs — same for every tenant.

---

## 6. Token Configuration (Recommended)

Go to **Token configuration** → **+ Add optional claim** → **ID token**

Select:
- ✅ `email`
- ✅ `preferred_username`

This ensures the login flow reliably gets the user's email.

---

## 7. Environment Variables

Create a `.env` file on the server with these values:

```env
# Azure AD
AZURE_AD_CLIENT_ID=<Application (client) ID from step 1>
AZURE_AD_TENANT_ID=<Directory (tenant) ID from step 1>
AZURE_AD_CLIENT_SECRET=<Client secret value from step 2>

# Auth
AUTH_SECRET=<random 32+ character string - generate with: openssl rand -base64 32>
AUTH_URL=https://<YOUR_DOMAIN>

# Admin access
ADMIN_EMAILS=admin1@company.com,admin2@company.com

# Database
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
```

---

## 8. Deploy the Outlook Add-in Manifest

1. Host the app and verify these URLs are accessible:
   - `https://<YOUR_DOMAIN>/commands.html`
   - `https://<YOUR_DOMAIN>/taskpane.html`
   - `https://<YOUR_DOMAIN>/icon-80.png`
2. The manifest files are pre-configured per environment:
   - `public/local/manifest.xml` → `http://localhost:3000`
   - `public/staging/manifest.xml` → `https://bss-www-sig.vercel.app`
   - `public/production/manifest.xml` → `https://blackstone.simtechitsolutions.in:8123`
   - Each manifest has a **unique `<Id>`** (add-in GUID) — do not change these
   - Update `<WebApplicationInfo><Id>` with your `AZURE_AD_CLIENT_ID` if using a new tenant
3. Go to **Microsoft 365 Admin Center** → **Settings** → **Integrated Apps**
4. Click **Upload custom apps** → **Office Add-in**
5. Upload the manifest XML file
6. Assign to the desired users/groups

---

## Summary Checklist

- [ ] App registered in Azure
- [ ] Client secret created and saved
- [ ] Redirect URIs added for all environments
- [ ] Delegated permissions: `openid`, `profile`
- [ ] Application permissions: `User.Read.All`, `Group.Read.All`, `GroupMember.Read.All`
- [ ] Admin consent granted
- [ ] API exposed with `access_as_user` scope — URI format: `api://<domain>/<client-id>`
- [ ] 6 Office client applications authorized
- [ ] Optional claims (`email`, `preferred_username`) added
- [ ] `.env` configured on server (including `AUTH_URL=https://<YOUR_DOMAIN>`)
- [ ] nginx configured with `X-Forwarded-Host $http_host` and `X-Forwarded-Port`
- [ ] Manifest uploaded to Integrated Apps (use correct manifest per environment)
