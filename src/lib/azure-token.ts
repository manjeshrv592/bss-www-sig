import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

/**
 * Verify an Office SSO token (access token from Office.auth.getAccessToken()).
 *
 * The token is issued by Azure AD for our app registration's "access_as_user" scope.
 * We verify:
 *  - Signature via Azure AD JWKS
 *  - Audience matches our client ID
 *  - Issuer matches our tenant
 *  - Token is not expired
 */

const TENANT_ID = process.env.AZURE_AD_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!;

const JWKS_URL = new URL(
  `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
);

// Cache the JWKS fetcher (jose handles key rotation internally)
const jwks = createRemoteJWKSet(JWKS_URL);

export interface VerifiedTokenPayload extends JWTPayload {
  preferred_username?: string;
  upn?: string;
  email?: string;
  name?: string;
  scp?: string;
}

export async function verifyOfficeToken(
  token: string
): Promise<VerifiedTokenPayload> {
  const { payload } = await jwtVerify(token, jwks, {
    audience: `api://${CLIENT_ID}`,
    issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  });

  // Ensure the token has the expected scope
  const scopes = (payload as VerifiedTokenPayload).scp ?? "";
  if (!scopes.includes("access_as_user")) {
    throw new Error("Token missing required scope: access_as_user");
  }

  return payload as VerifiedTokenPayload;
}
