const SECURE = process.env.NODE_ENV === "production";

/**
 * __Host- cookies are bound to this exact host and path with Secure required,
 * which browsers refuse over plain http, hence the prefix only in production.
 * Kept dependency-free so middleware (edge) can import it.
 */
export const ADMIN_SESSION_COOKIE = SECURE ? "__Host-portfolio_admin_session" : "portfolio_admin_session";
export const ADMIN_MFA_COOKIE = SECURE ? "__Host-portfolio_admin_mfa" : "portfolio_admin_mfa";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const ADMIN_COOKIES_SECURE = SECURE;
