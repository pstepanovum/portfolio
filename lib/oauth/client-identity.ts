/**
 * Guards the one piece of the consent screen an attacker controls: the client
 * name.
 *
 * Dynamic registration is open, so anyone can register a client called
 * "Claude" whose redirect URI is their own server, then send the owner a link
 * to approve it. The consent screen would read "Connect Claude?", one click
 * would hand them a token reaching mail and bank data, and PKCE does not help
 * because the attacker starts the flow and holds the verifier.
 *
 * Rather than add a code prompt to every approval, a client that names a known
 * product must send its codes to that product's own domain. A real Claude
 * always redirects to claude.ai; one that redirects anywhere else is refused.
 * A client with an unrecognised name is still allowed, and the consent screen
 * shows where its code will go so the owner can judge it.
 */

type KnownProduct = {
  label: string;
  /** Normalised tokens that, if present in a client name, claim this product. */
  tokens: string[];
  /** Hostnames allowed to receive codes, matched exactly or as a subdomain. */
  hosts: string[];
  /** Private-use URI schemes the product's native app registers. */
  schemes?: string[];
};

const KNOWN_PRODUCTS: KnownProduct[] = [
  { label: "Claude", tokens: ["claude", "anthropic"], hosts: ["claude.ai", "claude.com", "anthropic.com"] },
  { label: "ChatGPT", tokens: ["chatgpt", "openai"], hosts: ["chatgpt.com", "openai.com"] },
  { label: "Muse", tokens: ["muse", "metaai"], hosts: ["meta.ai"] },
  { label: "Cursor", tokens: ["cursor"], hosts: ["cursor.com", "cursor.sh"], schemes: ["cursor"] },
  { label: "Visual Studio Code", tokens: ["vscode", "visualstudiocode"], hosts: ["vscode.dev"], schemes: ["vscode", "vscode-insiders"] },
];

/**
 * Characters that change how text renders without being visible: bidi
 * overrides and isolates can reverse "edualC" into "Claude" on screen, and
 * zero-width characters split a name so it no longer matches a token.
 */
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;

const BIDI_CONTROL = /[\u202A-\u202E\u2066-\u2069]/;

/** Latin lookalikes from Cyrillic and Greek, so "Сlaude" with a Cyrillic С still matches. */
const CONFUSABLES: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "һ": "h", "ӏ": "l",
  "α": "a", "ε": "e", "ο": "o", "ρ": "p", "ν": "v", "τ": "t", "ι": "i", "κ": "k", "χ": "x", "μ": "u",
};

/** Cleans a client name for storage and display. */
export function sanitizeClientName(raw: string, fallback = "MCP Client") {
  const cleaned = raw.normalize("NFKC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || fallback;
}

/** Folds a name to lowercase ASCII letters and digits for product matching. */
function fold(name: string) {
  return name
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .toLowerCase()
    .split("")
    .map((char) => CONFUSABLES[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

function isLoopback(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

function hostMatches(hostname: string, allowed: string) {
  const host = hostname.toLowerCase();
  return host === allowed || host.endsWith(`.${allowed}`);
}

/**
 * Returns an explanation when a client claims to be a known product but would
 * send its authorization code somewhere that product does not own, or null
 * when the pairing is acceptable.
 *
 * Loopback redirects are always acceptable: a code sent to localhost lands on
 * the owner's own machine, never on a server an attacker controls.
 */
export function findImpersonation(clientName: string, redirectUri: string): string | null {
  const folded = fold(clientName);
  // A right-to-left override renders "edualc" as "claude". The override is
  // stripped before a name is stored or shown, but a name that carried one was
  // built to be read backwards, so it is matched both ways round.
  const readings = BIDI_CONTROL.test(clientName) ? [folded, [...folded].reverse().join("")] : [folded];
  const product = KNOWN_PRODUCTS.find((candidate) =>
    candidate.tokens.some((token) => readings.some((reading) => reading.includes(token))),
  );

  if (!product) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(redirectUri);
  } catch {
    return `This client calls itself ${product.label} but its redirect URI is not a valid URL.`;
  }

  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    if (isLoopback(parsed.hostname)) {
      return null;
    }

    if (parsed.protocol === "https:" && product.hosts.some((allowed) => hostMatches(parsed.hostname, allowed))) {
      return null;
    }

    return `This client calls itself ${product.label}, but it would send the authorization code to ${parsed.hostname}, which ${product.label} does not use. It may be impersonating ${product.label}.`;
  }

  const scheme = parsed.protocol.replace(/:$/, "");

  if (product.schemes?.includes(scheme)) {
    return null;
  }

  return `This client calls itself ${product.label}, but it would send the authorization code to a "${scheme}:" address that ${product.label} does not use. It may be impersonating ${product.label}.`;
}

/** The part of a redirect URI the owner should look at before approving. */
export function describeRedirectTarget(redirectUri: string) {
  try {
    const parsed = new URL(redirectUri);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return { destination: parsed.hostname, loopback: isLoopback(parsed.hostname) };
    }

    return { destination: `${parsed.protocol}//`, loopback: false };
  } catch {
    return { destination: redirectUri, loopback: false };
  }
}
