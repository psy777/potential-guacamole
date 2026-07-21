// Small, dependency-free constants that are safe to import from anywhere,
// including the Edge middleware (which cannot load native modules like the DB).

export const SESSION_COOKIE = "fc_session"; // internal Studio users
export const WHOLESALE_COOKIE = "cc_wholesale"; // wholesale-portal contacts

// Routes that do NOT require a logged-in internal user.
export const PUBLIC_PATHS = ["/login", "/setup"];

// Path prefixes that bypass INTERNAL auth entirely (webhooks are authenticated
// by provider signatures; the portal has its own separate auth check; product
// images are public so the portal + emails can display them).
export const PUBLIC_PREFIXES = ["/api/webhooks/", "/api/images/", "/portal"];

// The wholesale portal path space + its public (unauthenticated) routes.
export const PORTAL_PREFIX = "/portal";
export const PORTAL_LOGIN = "/portal/login";
export const PORTAL_ACTIVATE = "/portal/activate";
export const PORTAL_PUBLIC_PATHS = [PORTAL_LOGIN, PORTAL_ACTIVATE];

// Hostname label that maps to the wholesale portal (e.g. wholesale.firecoast.net).
export const WHOLESALE_SUBDOMAIN = "wholesale";
