/**
 * YouTube URL parsing.
 *
 * Pure and dependency-free on purpose: it is the part most likely to be wrong
 * on a link pasted from a phone, and it is covered by tests.
 */

export const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Hosts that can carry a watch id, after www./m./music. is stripped. */
const HOSTS = new Set([
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
]);

/** Path forms that put the id in the first path segment. */
const ID_IN_PATH = new Set(["shorts", "live", "embed", "v", "e"]);

function stripSubdomain(host: string) {
  return host.toLowerCase().replace(/^(www|m|music|gaming)\./, "");
}

function firstValidId(...candidates: (string | null | undefined)[]) {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();

    if (trimmed && VIDEO_ID_PATTERN.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Pulls the 11-character video id out of anything Pavel is likely to paste:
 * youtu.be/ID?si=…, watch?v=ID&t=…, /shorts/ID, /live/ID, /embed/ID, a bare
 * id, a scheme-less youtube.com/… , or an attribution_link wrapper.
 *
 * Returns null for anything that is not a YouTube video link, so the caller
 * can say so rather than fetching a stranger's URL.
 */
export function parseVideoId(input: string, depth = 0): string | null {
  const raw = input?.trim();

  if (!raw || depth > 2) {
    return null;
  }

  if (VIDEO_ID_PATTERN.test(raw)) {
    return raw;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;

  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const host = stripSubdomain(url.hostname);

  if (!HOSTS.has(host)) {
    return null;
  }

  // youtu.be/<id>
  if (host === "youtu.be") {
    return firstValidId(url.pathname.split("/").filter(Boolean)[0]);
  }

  const segments = url.pathname.split("/").filter(Boolean);

  // Share wrappers such as /attribution_link?u=%2Fwatch%3Fv%3D<id>
  const wrapped = url.searchParams.get("u") ?? url.searchParams.get("url");

  if (wrapped) {
    const nested = parseVideoId(
      wrapped.startsWith("/") ? `https://www.youtube.com${wrapped}` : wrapped,
      depth + 1,
    );

    if (nested) {
      return nested;
    }
  }

  if (segments[0] && ID_IN_PATH.has(segments[0].toLowerCase())) {
    return firstValidId(segments[1]);
  }

  // /watch?v=<id>, /watch_popup?v=<id>, and the odd /<id> path.
  return firstValidId(
    url.searchParams.get("v"),
    url.searchParams.get("video_id"),
    segments.length === 1 ? segments[0] : undefined,
  );
}

/** Canonical watch URL, which is what gets written into the saved file. */
export function watchUrl(videoId: string, startSeconds?: number) {
  const base = `https://www.youtube.com/watch?v=${videoId}`;

  return startSeconds && startSeconds > 0
    ? `${base}&t=${Math.floor(startSeconds)}s`
    : base;
}
