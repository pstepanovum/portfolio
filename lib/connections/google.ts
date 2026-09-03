import "server-only";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

/** Registered as the authorised redirect URI on the Google OAuth client. */
export const GOOGLE_CALLBACK_PATH = "/api/admin/connections/google/callback";

/**
 * The scope set Composio's Gmail toolkit requests, verbatim from its consent
 * screen: full mailbox access, the two settings scopes, identity, and the
 * People API scopes behind contact search and the self-profile.
 *
 * mail.google.com is the superset of every gmail.* mail scope and the only one
 * permitting permanent deletion. All of the Gmail scopes are "restricted", so
 * the additions change nothing about Google's verification burden.
 */
export const GMAIL_OAUTH_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.settings.sharing",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/contacts.other.readonly",
  "https://www.googleapis.com/auth/profile.language.read",
  "https://www.googleapis.com/auth/user.birthday.read",
  "https://www.googleapis.com/auth/user.addresses.read",
  "https://www.googleapis.com/auth/user.phonenumbers.read",
] as const;

/** A connection granted less than this was made before the scope change. */
export function hasFullGmailScopes(granted: string[]) {
  return GMAIL_OAUTH_SCOPES.every((scope) => granted.includes(scope));
}

export type GoogleTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
};

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }

  /** invalid_grant means the refresh token is dead: expired, revoked, or rotated. */
  get requiresReconnect() {
    return this.code === "invalid_grant";
  }
}

function getClientCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new GoogleAuthError(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are not configured.",
      "not_configured",
      500,
    );
  }

  return { clientId, clientSecret };
}

export function isGoogleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
  );
}

export function buildGoogleAuthUrl(input: {
  redirectUri: string;
  state: string;
  loginHint?: string;
}) {
  const { clientId } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GMAIL_OAUTH_SCOPES.join(" "),
    // offline + consent together are what make Google return a refresh token
    // on every connection, including reconnects of an account it has seen.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
  });

  if (input.loginHint) {
    params.set("login_hint", input.loginHint);
  }

  return `${AUTH_ENDPOINT}?${params}`;
}

async function requestToken(body: Record<string, string>) {
  const { clientId, clientSecret } = getClientCredentials();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...body,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const code = typeof data.error === "string" ? data.error : "token_error";
    const description =
      typeof data.error_description === "string"
        ? data.error_description
        : "Google rejected the token request.";

    throw new GoogleAuthError(description, code, response.status);
  }

  return {
    accessToken: String(data.access_token),
    refreshToken:
      typeof data.refresh_token === "string" ? data.refresh_token : undefined,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
    scope: typeof data.scope === "string" ? data.scope : "",
  } satisfies GoogleTokenResponse;
}

export function exchangeCodeForTokens(code: string, redirectUri: string) {
  return requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

export function refreshAccessToken(refreshToken: string) {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/** Best effort: a failed revoke must never block deleting our own record. */
export async function revokeGoogleToken(token: string) {
  try {
    await fetch(`${REVOKE_ENDPOINT}?${new URLSearchParams({ token })}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    // Ignored on purpose.
  }
}
