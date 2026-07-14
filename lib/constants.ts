// Small, dependency-free constants that are safe to import from anywhere,
// including the Edge middleware (which cannot load native modules like the DB).

export const SESSION_COOKIE = "fc_session";

// Routes that do NOT require a logged-in user.
export const PUBLIC_PATHS = ["/login", "/setup"];

// Path prefixes that bypass auth entirely (webhooks are authenticated by
// provider signatures, not by our session cookie).
export const PUBLIC_PREFIXES = ["/api/webhooks/"];
