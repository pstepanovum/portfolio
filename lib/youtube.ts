/**
 * YouTube link detection for project media.
 *
 * A project's `demo` field doubles as its video slot: when the URL points at
 * YouTube the UI embeds a player instead of rendering an outbound link.
 */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/** Video ids are exactly 11 characters of the URL-safe alphabet. */
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

const PATH_PREFIXES = new Set(["embed", "shorts", "live", "v"]);

export type YouTubeEmbed = {
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
  watchUrl: string;
};

/** Accepts "90", "1m30s", "1h2m3s" — the forms YouTube puts in share links. */
function parseStartSeconds(url: URL) {
  const raw = url.searchParams.get("start") || url.searchParams.get("t");

  if (!raw) {
    return null;
  }

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return seconds > 0 ? seconds : null;
  }

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);

  if (!match) {
    return null;
  }

  const [, hours, minutes, seconds] = match;
  const total =
    Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);

  return total > 0 ? total : null;
}

export function getYouTubeVideoId(url?: string | null) {
  if (!url) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  // youtu.be/<id>
  if (host.endsWith("youtu.be")) {
    const [id] = parsed.pathname.split("/").filter(Boolean);
    return id && VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  // youtube.com/watch?v=<id>
  const queryId = parsed.searchParams.get("v");

  if (queryId && VIDEO_ID_PATTERN.test(queryId)) {
    return queryId;
  }

  // youtube.com/{embed,shorts,live,v}/<id>
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (segments.length >= 2 && PATH_PREFIXES.has(segments[0].toLowerCase())) {
    return VIDEO_ID_PATTERN.test(segments[1]) ? segments[1] : null;
  }

  return null;
}

/**
 * Returns embed details for a YouTube URL, or null for anything else — which
 * is what tells the UI to fall back to the still image and a plain link.
 */
export function getYouTubeEmbed(url?: string | null): YouTubeEmbed | null {
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return null;
  }

  let start: number | null = null;

  try {
    start = parseStartSeconds(new URL((url as string).trim()));
  } catch {
    start = null;
  }

  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });

  if (start) {
    params.set("start", String(start));
  }

  return {
    videoId,
    // nocookie avoids setting tracking cookies until the viewer hits play.
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${params}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export function isYouTubeUrl(url?: string | null) {
  return getYouTubeVideoId(url) !== null;
}
