const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const TENANT_ID = process.env.AZURE_AD_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  // Client credentials flow — uses Application permissions
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get Graph token: ${err?.error_description ?? res.statusText}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function graphFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `Graph API error ${res.status}: ${error?.error?.message ?? res.statusText}`
    );
  }

  return res.json();
}

export interface GraphUser {
  id: string;
  mail: string | null;
  userPrincipalName: string;
  displayName: string | null;
  givenName: string | null;
  surname: string | null;
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  city: string | null;
  country: string | null;
  companyName: string | null;
  mobilePhone: string | null;
  businessPhones: string[];
  accountEnabled: boolean;
}

interface GraphUsersResponse {
  value: GraphUser[];
  "@odata.nextLink"?: string;
}

const USER_SELECT = [
  "id",
  "mail",
  "userPrincipalName",
  "displayName",
  "givenName",
  "surname",
  "jobTitle",
  "department",
  "officeLocation",
  "city",
  "country",
  "companyName",
  "mobilePhone",
  "businessPhones",
  "accountEnabled",
].join(",");

// ─── Groups ──────────────────────────────────

export interface GraphGroup {
  id: string;
  displayName: string;
  description: string | null;
  mailEnabled: boolean;
  securityEnabled: boolean;
}

interface GraphGroupsResponse {
  value: GraphGroup[];
  "@odata.nextLink"?: string;
}

interface GraphMembersResponse {
  value: { id: string; "@odata.type": string }[];
  "@odata.nextLink"?: string;
}

export async function fetchAllGraphGroups(): Promise<GraphGroup[]> {
  const allGroups: GraphGroup[] = [];
  let url: string | null = `/groups?$select=id,displayName,description,mailEnabled,securityEnabled&$top=999`;

  while (url) {
    const response: GraphGroupsResponse = await graphFetch(url);
    allGroups.push(...response.value);

    const nextLink = response["@odata.nextLink"];
    url = nextLink ? nextLink.replace(GRAPH_BASE, "") : null;
  }

  return allGroups;
}

export async function fetchGroupMembers(groupMsId: string): Promise<string[]> {
  const memberIds: string[] = [];
  let url: string | null = `/groups/${groupMsId}/members?$select=id&$top=999`;

  while (url) {
    const response: GraphMembersResponse = await graphFetch(url);
    for (const m of response.value) {
      if (m["@odata.type"] === "#microsoft.graph.user") {
        memberIds.push(m.id);
      }
    }

    const nextLink = response["@odata.nextLink"];
    url = nextLink ? nextLink.replace(GRAPH_BASE, "") : null;
  }

  return memberIds;
}

// ─── Users ───────────────────────────────────

export async function fetchAllGraphUsers(): Promise<GraphUser[]> {
  const allUsers: GraphUser[] = [];
  let url: string | null = `/users?$select=${USER_SELECT}&$top=999`;

  while (url) {
    const response: GraphUsersResponse = await graphFetch(url);
    allUsers.push(...response.value);

    const nextLink = response["@odata.nextLink"];
    if (nextLink) {
      url = nextLink.replace(GRAPH_BASE, "");
    } else {
      url = null;
    }
  }

  return allUsers;
}
