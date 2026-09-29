import "server-only";

import { YouTubeTranscriptError } from "@/lib/youtube/errors";
import type { TranscriptCue } from "@/lib/youtube/transcript-text";

/**
 * Caption fetching, in TypeScript, with no binary and no Python.
 *
 * The caption track list comes from YouTube's own player endpoint (InnerTube),
 * which is what the site itself calls; the cues then come from the timedtext
 * URL that endpoint hands back. Several client identities are tried in turn
 * because a shared Cloud Run egress IP gets refused far more often on some of
 * them than on others, and the watch page is the last resort.
 */

const PLAYER_ENDPOINT = "https://www.youtube.com/youtubei/v1/player";
const WATCH_URL = "https://www.youtube.com/watch";

/** The public InnerTube key the web player itself ships with. */
const DEFAULT_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

type Json = Record<string, unknown>;

type ClientProfile = {
  name: string;
  context: Json;
  headers: Record<string, string>;
};

/**
 * Client identities, most likely to work first.
 *
 * The plain WEB and ANDROID players now answer UNPLAYABLE ("the page needs to
 * be reloaded") or FAILED_PRECONDITION to any caller that cannot produce a
 * proof-of-origin token, which needs YouTube's own attestation VM and is out of
 * reach here. The headset client still answers in full and hands back caption
 * URLs that actually serve their cues, so it leads; the rest are hedges for the
 * day it stops.
 */
const CLIENTS: ClientProfile[] = [
  {
    name: "ANDROID_VR",
    context: {
      clientName: "ANDROID_VR",
      clientVersion: "1.60.19",
      deviceMake: "Oculus",
      deviceModel: "Quest 3",
      osName: "Android",
      osVersion: "12L",
      androidSdkVersion: 32,
      hl: "en",
      gl: "US",
    },
    headers: {
      "User-Agent":
        "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
      "X-YouTube-Client-Name": "28",
      "X-YouTube-Client-Version": "1.60.19",
    },
  },
  {
    name: "WEB_EMBEDDED_PLAYER",
    context: {
      clientName: "WEB_EMBEDDED_PLAYER",
      clientVersion: "1.20240723.01.00",
      hl: "en",
      gl: "US",
    },
    headers: {
      "User-Agent": DESKTOP_UA,
      "X-YouTube-Client-Name": "56",
      "X-YouTube-Client-Version": "1.20240723.01.00",
    },
  },
  {
    name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    context: {
      clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      clientVersion: "2.0",
      clientScreen: "EMBED",
      hl: "en",
      gl: "US",
    },
    headers: {
      "User-Agent": "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko)",
      "X-YouTube-Client-Name": "85",
      "X-YouTube-Client-Version": "2.0",
    },
  },
  {
    name: "WEB",
    context: {
      clientName: "WEB",
      clientVersion: "2.20240726.00.00",
      hl: "en",
      gl: "US",
    },
    headers: {
      "User-Agent": DESKTOP_UA,
      "X-YouTube-Client-Name": "1",
      "X-YouTube-Client-Version": "2.20240726.00.00",
    },
  },
];

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bounded exponential backoff with jitter. Kept short on purpose: the MCP
 * route has a 60 second budget and a caller waiting on a podcast would rather
 * hear "blocked, try again" than time out.
 */
async function requestWithRetry(url: string, init: RequestInit) {
  let lastStatus = 0;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await delay(BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
    }

    try {
      const response = await fetch(url, { ...init, cache: "no-store" });

      if (response.ok) {
        return response;
      }

      lastStatus = response.status;

      if (!RETRYABLE_STATUSES.has(response.status)) {
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastStatus === 429 || lastStatus === 403) {
    throw new YouTubeTranscriptError(
      `YouTube refused the request (HTTP ${lastStatus}).`,
      "blocked",
      true,
    );
  }

  if (lastStatus >= 500) {
    throw new YouTubeTranscriptError(
      `YouTube returned HTTP ${lastStatus} after ${MAX_ATTEMPTS} attempts.`,
      "blocked",
      true,
    );
  }

  if (lastStatus > 0) {
    throw new YouTubeTranscriptError(`YouTube returned HTTP ${lastStatus}.`, "network", false);
  }

  throw new YouTubeTranscriptError(
    `Could not reach YouTube: ${lastError instanceof Error ? lastError.message : "network error"}.`,
    "network",
    true,
  );
}

export type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  languageName: string;
  autoGenerated: boolean;
  translatable: boolean;
};

export type TranslationLanguage = { languageCode: string; languageName: string };

export type VideoMetadata = {
  id: string;
  title: string;
  channel: string;
  durationSeconds: number;
  description: string;
  publishedAt?: string;
  isLive: boolean;
};

export type PlayerData = {
  video: VideoMetadata;
  tracks: CaptionTrack[];
  translationLanguages: TranslationLanguage[];
  /** Index into `tracks` the player itself treats as the default. */
  defaultTrackIndex: number | null;
  /** Which client identity answered, reported back for diagnosis. */
  client: string;
};

function asRecord(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {};
}

function readText(value: unknown): string {
  const record = asRecord(value);

  if (typeof record.simpleText === "string") {
    return record.simpleText;
  }

  if (Array.isArray(record.runs)) {
    return record.runs.map((run) => String(asRecord(run).text ?? "")).join("");
  }

  return "";
}

function parseTracks(player: Json) {
  const list = asRecord(
    asRecord(player.captions).playerCaptionsTracklistRenderer,
  );
  const rawTracks = Array.isArray(list.captionTracks) ? list.captionTracks : [];
  const tracks: CaptionTrack[] = rawTracks.flatMap((raw) => {
    const track = asRecord(raw);
    const baseUrl = typeof track.baseUrl === "string" ? track.baseUrl : "";

    if (!baseUrl) {
      return [];
    }

    const vssId = typeof track.vssId === "string" ? track.vssId : "";

    return [
      {
        baseUrl,
        languageCode: String(track.languageCode ?? ""),
        languageName: readText(track.name) || String(track.languageCode ?? ""),
        // `kind: "asr"` is YouTube's own marker for automatic speech
        // recognition; the vssId prefix says the same thing on older payloads.
        autoGenerated: track.kind === "asr" || vssId.startsWith("a."),
        translatable: track.isTranslatable !== false,
      },
    ];
  });

  const audioTracks = Array.isArray(list.audioTracks) ? list.audioTracks : [];
  const defaultIndex = audioTracks
    .map((entry) => asRecord(entry).defaultCaptionTrackIndex)
    .find((value) => typeof value === "number");

  const translationLanguages: TranslationLanguage[] = (
    Array.isArray(list.translationLanguages) ? list.translationLanguages : []
  ).map((raw) => {
    const entry = asRecord(raw);

    return {
      languageCode: String(entry.languageCode ?? ""),
      languageName: readText(entry.languageName) || String(entry.languageCode ?? ""),
    };
  });

  return {
    tracks,
    translationLanguages,
    defaultTrackIndex:
      typeof defaultIndex === "number" && defaultIndex >= 0 && defaultIndex < tracks.length
        ? defaultIndex
        : null,
  };
}

function parseVideo(player: Json, videoId: string): VideoMetadata {
  const details = asRecord(player.videoDetails);
  const micro = asRecord(asRecord(player.microformat).playerMicroformatRenderer);

  return {
    id: String(details.videoId ?? videoId),
    title: String(details.title ?? readText(micro.title) ?? "").trim() || "Untitled video",
    channel: String(details.author ?? micro.ownerChannelName ?? "").trim(),
    durationSeconds: Number.parseInt(String(details.lengthSeconds ?? micro.lengthSeconds ?? "0"), 10) || 0,
    description: String(details.shortDescription ?? readText(micro.description) ?? ""),
    publishedAt: typeof micro.publishDate === "string" ? micro.publishDate : undefined,
    isLive: details.isLive === true || details.isLiveContent === true,
  };
}

/**
 * Reasons that mean "this caller was refused", not "this video is gone". The
 * reload wording is what a player without a proof-of-origin token is told, and
 * it arrives dressed up as UNPLAYABLE.
 */
const BLOCKED_REASONS =
  /sign in|not a bot|confirm you|unusual traffic|too many requests|needs to be reloaded|try again later/i;

type PlayerFailure = {
  code: "blocked" | "unavailable" | "no_captions" | "network";
  message: string;
};

type PlayerAttempt =
  | { ok: true; data: PlayerData }
  | { ok: false; code: "blocked" | "unavailable" | "no_captions"; message: string };

function interpretPlayer(player: Json, videoId: string, client: string): PlayerAttempt {
  const status = asRecord(player.playabilityStatus);
  const state = String(status.status ?? "");
  const reason = `${readText(status.reason) || String(status.reason ?? "")} ${readText(
    asRecord(asRecord(status.errorScreen).playerErrorMessageRenderer).subreason,
  )}`.trim();

  if (state === "LOGIN_REQUIRED" || state === "AGE_CHECK_REQUIRED" || BLOCKED_REASONS.test(reason)) {
    return {
      ok: false,
      code: "blocked",
      message: reason || "YouTube asked this server to sign in.",
    };
  }

  if (state && state !== "OK" && state !== "LIVE_STREAM_OFFLINE") {
    return {
      ok: false,
      code: "unavailable",
      message: reason || `YouTube reported the video as ${state.toLowerCase()}.`,
    };
  }

  const { tracks, translationLanguages, defaultTrackIndex } = parseTracks(player);

  if (tracks.length === 0) {
    return {
      ok: false,
      code: "no_captions",
      message: "The player response carried no caption tracks.",
    };
  }

  return {
    ok: true,
    data: {
      video: parseVideo(player, videoId),
      tracks,
      translationLanguages,
      defaultTrackIndex,
      client,
    },
  };
}

async function requestPlayer(videoId: string, client: ClientProfile) {
  const key = process.env.YOUTUBE_INNERTUBE_KEY?.trim() || DEFAULT_KEY;
  const response = await requestWithRetry(`${PLAYER_ENDPOINT}?prettyPrint=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Origin: "https://www.youtube.com",
      // The endpoint takes the player's public key as a header; the old
      // ?key= query form is answered with FAILED_PRECONDITION.
      "X-Goog-Api-Key": key,
      ...client.headers,
    },
    body: JSON.stringify({
      videoId,
      context: { client: client.context },
      contentCheckOk: true,
      racyCheckOk: true,
    }),
  });

  return (await response.json()) as Json;
}

/**
 * Pulls `ytInitialPlayerResponse` out of the watch page by scanning balanced
 * braces, which survives the minified inline script far better than a regex.
 */
export function extractJsonObject(html: string, marker: string): Json | null {
  const markerIndex = html.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const start = html.indexOf("{", markerIndex + marker.length);

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, index + 1)) as Json;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

async function requestWatchPage(videoId: string) {
  const response = await requestWithRetry(
    `${WATCH_URL}?v=${encodeURIComponent(videoId)}&hl=en&bpctr=9999999999&has_verified=1`,
    {
      headers: {
        "User-Agent": DESKTOP_UA,
        "Accept-Language": "en-US,en;q=0.9",
        // Skips the EU consent interstitial, which otherwise replaces the page.
        Cookie: "SOCS=CAI; CONSENT=YES+cb",
      },
    },
  );

  const html = await response.text();

  if (/consent\.youtube\.com|recaptcha/i.test(html.slice(0, 4000))) {
    throw new YouTubeTranscriptError(
      "YouTube served a consent or captcha wall instead of the video page.",
      "blocked",
      true,
    );
  }

  return extractJsonObject(html, "ytInitialPlayerResponse");
}

/**
 * Tries each client identity, then the watch page.
 *
 * A refusal on one client is never fatal, because the players that cannot
 * produce a proof-of-origin token report a perfectly healthy video as
 * unplayable. The only attempt whose "this video is gone" is believed on its
 * own is the first one, which is the client that still answers properly. If
 * nothing got through, the caller hears "blocked" rather than "no captions":
 * one is worth retrying in a few minutes and the other never is.
 */
export async function fetchPlayerData(videoId: string): Promise<PlayerData> {
  const failures: PlayerFailure[] = [];

  for (const [index, client] of CLIENTS.entries()) {
    try {
      const attempt = interpretPlayer(await requestPlayer(videoId, client), videoId, client.name);

      if (attempt.ok) {
        return attempt.data;
      }

      failures.push({ code: attempt.code, message: `${client.name}: ${attempt.message}` });

      if (attempt.code === "unavailable" && index === 0) {
        break;
      }
    } catch (error) {
      failures.push({
        code: error instanceof YouTubeTranscriptError && error.code === "network" ? "network" : "blocked",
        message: `${client.name}: ${error instanceof Error ? error.message : "request failed"}`,
      });
    }
  }

  const watchPlayer = await requestWatchPage(videoId).catch((error) => {
    failures.push({
      code:
        error instanceof YouTubeTranscriptError && error.code === "network" ? "network" : "blocked",
      message: `watch page: ${error instanceof Error ? error.message : "request failed"}`,
    });

    return null;
  });

  if (watchPlayer) {
    const attempt = interpretPlayer(watchPlayer, videoId, "WATCH_PAGE");

    if (attempt.ok) {
      return attempt.data;
    }

    failures.push({ code: attempt.code, message: `watch page: ${attempt.message}` });
  }

  // Ordered by how much each failure is worth believing: a player that got
  // through and found no tracks is conclusive, a missing video next, and
  // everything else is this server being refused.
  const pick = (code: PlayerFailure["code"]) => failures.find((failure) => failure.code === code);
  const conclusive = pick("no_captions") ?? pick("unavailable");

  if (conclusive) {
    throw new YouTubeTranscriptError(
      conclusive.code === "no_captions"
        ? "This video has no caption tracks at all, not even automatic ones."
        : conclusive.message,
      conclusive.code,
      false,
    );
  }

  if (failures.length > 0 && failures.every((failure) => failure.code === "network")) {
    throw new YouTubeTranscriptError(
      `YouTube could not be reached (${failures[0].message}).`,
      "network",
      true,
    );
  }

  throw new YouTubeTranscriptError(
    `YouTube would not hand over the caption list for this video. This is normally rate limiting on this server's address rather than anything about the video, so it is worth trying again in a few minutes. Attempts: ${failures
      .map((failure) => failure.message)
      .join(" | ")}`,
    "blocked",
    true,
  );
}

type Json3Event = {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: { utf8?: string }[];
};

function parseJson3(body: string): TranscriptCue[] {
  const data = JSON.parse(body) as { events?: Json3Event[] };

  return (data.events ?? []).flatMap((event) => {
    const text = (event.segs ?? []).map((seg) => seg.utf8 ?? "").join("");

    if (!text.trim() || typeof event.tStartMs !== "number") {
      return [];
    }

    return [
      {
        start: event.tStartMs / 1000,
        duration: (event.dDurationMs ?? 0) / 1000,
        text,
      },
    ];
  });
}

const LEGACY_CUE = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
const SRV3_CUE = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;

function attribute(attributes: string, name: string) {
  return new RegExp(`\\b${name}="([\\d.]+)"`).exec(attributes)?.[1];
}

/**
 * Caption XML comes in two shapes. The signed URLs currently hand back srv3,
 * where times are milliseconds on <p> and automatic captions split every word
 * into its own <s> child; the older form is <text start= dur=> in seconds.
 */
function parseXml(body: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  let match: RegExpExecArray | null;

  SRV3_CUE.lastIndex = 0;

  while ((match = SRV3_CUE.exec(body)) !== null) {
    const start = Number.parseFloat(attribute(match[1], "t") ?? "");

    if (!Number.isFinite(start)) {
      continue;
    }

    cues.push({
      start: start / 1000,
      duration: Number.parseFloat(attribute(match[1], "d") ?? "0") / 1000 || 0,
      // <s> children are word fragments; their text concatenated is the line.
      text: match[2].replace(/<\/?s\b[^>]*>/g, ""),
    });
  }

  if (cues.length > 0) {
    return cues;
  }

  LEGACY_CUE.lastIndex = 0;

  while ((match = LEGACY_CUE.exec(body)) !== null) {
    const start = Number.parseFloat(attribute(match[1], "start") ?? "");

    if (!Number.isFinite(start)) {
      continue;
    }

    cues.push({
      start,
      duration: Number.parseFloat(attribute(match[1], "dur") ?? "0") || 0,
      text: match[2],
    });
  }

  return cues;
}

function timedTextUrl(baseUrl: string, format: "json3" | "xml", translateTo?: string) {
  const url = new URL(baseUrl);

  url.searchParams.delete("fmt");

  if (format === "json3") {
    url.searchParams.set("fmt", "json3");
  }

  if (translateTo) {
    url.searchParams.set("tlang", translateTo);
  } else {
    url.searchParams.delete("tlang");
  }

  return url.toString();
}

/**
 * Fetches the cues for one track. An empty body is YouTube's quiet way of
 * throttling, so it is treated as a block rather than as an empty transcript.
 */
export async function fetchCues(
  track: CaptionTrack,
  translateTo?: string,
): Promise<TranscriptCue[]> {
  const attempts: ("json3" | "xml")[] = ["json3", "xml"];
  let lastError: unknown;

  for (const format of attempts) {
    try {
      const response = await requestWithRetry(timedTextUrl(track.baseUrl, format, translateTo), {
        headers: {
          "User-Agent": DESKTOP_UA,
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://www.youtube.com",
        },
      });

      const body = await response.text();

      if (!body.trim()) {
        lastError = new YouTubeTranscriptError(
          "YouTube listed this caption track and then served nothing for it. An empty body is how it throttles a shared server address, so the captions are not missing; try again in a few minutes.",
          "blocked",
          true,
        );
        continue;
      }

      const cues = format === "json3" ? parseJson3(body) : parseXml(body);

      if (cues.length > 0) {
        return cues;
      }

      lastError = new YouTubeTranscriptError(
        "The caption track came back with no cues in it, which is throttling rather than a video without captions; try again in a few minutes.",
        "blocked",
        true,
      );
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof YouTubeTranscriptError) {
    throw lastError;
  }

  throw new YouTubeTranscriptError(
    `The caption track could not be read: ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }.`,
    "blocked",
    true,
  );
}
