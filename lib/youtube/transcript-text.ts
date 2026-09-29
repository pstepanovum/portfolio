/**
 * Turning caption cues into something readable.
 *
 * Everything here is pure so it can be tested without touching YouTube: cue
 * merging, the auto-caption stutter that comes from rolling captions, chapter
 * parsing, timestamps, and the cache key.
 */

export type TranscriptCue = {
  /** Seconds from the start of the video. */
  start: number;
  /** Seconds the cue stays on screen; 0 when the source did not say. */
  duration: number;
  text: string;
};

export type Chapter = {
  start: number;
  title: string;
};

export type TranscriptParagraph = {
  start: number;
  text: string;
};

export type TranscriptSection = {
  chapter: Chapter | null;
  paragraphs: TranscriptParagraph[];
};

export type TranscriptFormat = "clean" | "stamps" | "raw";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#34": '"',
};

/**
 * Caption XML is entity-encoded, and often double-encoded (&amp;#39;), so this
 * runs twice. json3 arrives already decoded, where a second pass is harmless.
 */
export function decodeEntities(text: string, passes = 2): string {
  let out = text;

  for (let pass = 0; pass < passes; pass += 1) {
    out = out.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name: string) => {
      const key = name.toLowerCase();

      if (ENTITIES[key] !== undefined) {
        return ENTITIES[key];
      }

      if (key.startsWith("#x")) {
        const code = Number.parseInt(key.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }

      if (key.startsWith("#")) {
        const code = Number.parseInt(key.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }

      return match;
    });
  }

  return out;
}

const NOISE_WORDS = [
  "music",
  "applause",
  "laughter",
  "laughs",
  "laughing",
  "chuckles",
  "chuckling",
  "cheering",
  "cheers",
  "clapping",
  "silence",
  "inaudible",
  "unintelligible",
  "crosstalk",
  "sighs",
  "coughs",
  "beep",
  "beeping",
  "noise",
  "blank_audio",
  "foreign",
].join("|");

/** Bracketed or parenthesised sound annotations, e.g. [Music], (upbeat music). */
const NOISE_ANNOTATION = new RegExp(
  `[\\[(][^\\])]{0,40}?\\b(?:${NOISE_WORDS})\\b[^\\])]{0,40}?[\\])]`,
  "gi",
);

/** Lyric markers YouTube uses instead of a bracketed annotation. */
const MUSIC_NOTES = /[♪♫]+/g;

/** Speaker-change arrows in broadcast captions; the words after them stay. */
const SPEAKER_ARROWS = /^\s*>>+\s*/;

export function stripNoise(text: string) {
  return text
    .replace(NOISE_ANNOTATION, " ")
    .replace(MUSIC_NOTES, " ")
    // "[♪♪♪]" leaves its brackets behind once the notes are gone.
    .replace(/[[(]\s*[\])]/g, " ")
    .replace(SPEAKER_ARROWS, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Caption cues carry line breaks and stray tags; neither survives here. */
export function normalizeCueText(text: string) {
  return decodeEntities(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordKey(word: string) {
  return word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
}

/**
 * Auto-captions repeat themselves: the rolling window re-emits the tail of one
 * cue at the head of the next, so the joined text reads "so I think so I think
 * we should". Any immediately repeated phrase of two or more words is that
 * artefact and is dropped. Single words are left alone except for runs longer
 * than two, because "no no no" and "very very" are things people say.
 */
export function collapseStutter(text: string, maxPhrase = 8) {
  const words = text.split(/\s+/).filter(Boolean);
  const keys = words.map(wordKey);
  const out: string[] = [];
  const outKeys: string[] = [];
  let index = 0;

  while (index < words.length) {
    let skipped = false;

    for (let size = Math.min(maxPhrase, outKeys.length); size >= 2; size -= 1) {
      if (index + size > words.length) {
        continue;
      }

      const incoming = keys.slice(index, index + size);

      if (incoming.some((key) => key === "")) {
        continue;
      }

      const previous = outKeys.slice(outKeys.length - size);

      if (previous.every((key, offset) => key === incoming[offset])) {
        index += size;
        skipped = true;
        break;
      }
    }

    if (skipped) {
      continue;
    }

    const key = keys[index];
    const isThirdInARun =
      key !== "" &&
      outKeys.length >= 2 &&
      outKeys[outKeys.length - 1] === key &&
      outKeys[outKeys.length - 2] === key;

    if (!isThirdInARun) {
      out.push(words[index]);
      outKeys.push(key);
    }

    index += 1;
  }

  return out.join(" ");
}

/**
 * Drops the leading words of a cue that merely repeat the tail of the one
 * before it. Cheaper and safer than whole-text de-duplication because it only
 * ever looks across one cue boundary.
 */
export function dropCueOverlap(previous: string, next: string, maxWords = 12) {
  const tail = previous.split(/\s+/).filter(Boolean).map(wordKey);
  const head = next.split(/\s+/).filter(Boolean);
  const headKeys = head.map(wordKey);

  for (let size = Math.min(maxWords, tail.length, headKeys.length); size >= 2; size -= 1) {
    const end = tail.slice(tail.length - size);
    const start = headKeys.slice(0, size);

    if (end.every((key, offset) => key !== "" && key === start[offset])) {
      return head.slice(size).join(" ");
    }
  }

  return next;
}

export function formatTimestamp(seconds: number, withHours = false) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0 || withHours
    ? `${hours}:${pad(minutes)}:${pad(secs)}`
    : `${minutes}:${pad(secs)}`;
}

export function parseTimestamp(value: string) {
  const parts = value.split(":").map((part) => Number.parseInt(part, 10));

  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

const LEADING_STAMP = /^[\s([]*(\d{1,3}:\d{2}(?::\d{2})?)[\s)\]]*[-–—:.|)]*\s*(.*)$/;
const TRAILING_STAMP = /^(.*?)[\s-–—:.|(]+(\d{1,3}:\d{2}(?::\d{2})?)[\s)\]]*$/;

/**
 * YouTube builds a video's chapter list from timestamps in its description:
 * at least three of them, the first at 0:00, in ascending order. The same rule
 * is applied here so a description that merely mentions a time does not turn
 * into headings.
 */
export function parseChaptersFromDescription(
  description: string | undefined,
  durationSeconds?: number,
): Chapter[] {
  if (!description) {
    return [];
  }

  const found: Chapter[] = [];

  for (const line of description.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const leading = LEADING_STAMP.exec(trimmed);
    const match = leading ?? TRAILING_STAMP.exec(trimmed);

    if (!match) {
      continue;
    }

    const stamp = leading ? match[1] : match[2];
    const rawTitle = leading ? match[2] : match[1];
    const start = parseTimestamp(stamp);
    const title = rawTitle.replace(/^[\s\-–—:.|)]+/, "").replace(/\s+/g, " ").trim();

    if (start === null || !title) {
      continue;
    }

    if (durationSeconds && start > durationSeconds + 1) {
      continue;
    }

    found.push({ start, title });
  }

  if (found.length < 3 || found[0].start !== 0) {
    return [];
  }

  const ordered: Chapter[] = [];

  for (const chapter of found) {
    if (ordered.length === 0 || chapter.start > ordered[ordered.length - 1].start) {
      ordered.push(chapter);
    }
  }

  return ordered.length >= 3 ? ordered : [];
}

/** The chapter a moment belongs to, or null before the first one. */
export function chapterAt(chapters: Chapter[], seconds: number) {
  let current: Chapter | null = null;

  for (const chapter of chapters) {
    if (chapter.start <= seconds) {
      current = chapter;
    } else {
      break;
    }
  }

  return current;
}

export type MergeOptions = {
  /** Soft limit; a paragraph breaks at the first cue past it. */
  maxChars?: number;
  /** A silence this long ends the paragraph. */
  gapSeconds?: number;
  /** Paragraphs never straddle one of these, so chapters line up. */
  boundaries?: number[];
  /** Off for `raw`, where the cues are returned as they arrived. */
  clean?: boolean;
};

/**
 * Cues are a few words each; paragraphs are what a person reads. Breaks happen
 * at a silence, at a chapter boundary, or once a paragraph has grown past the
 * soft limit.
 */
export function mergeCuesIntoParagraphs(
  cues: TranscriptCue[],
  options: MergeOptions = {},
): TranscriptParagraph[] {
  const maxChars = options.maxChars ?? 700;
  const gapSeconds = options.gapSeconds ?? 2.5;
  const clean = options.clean !== false;
  const boundaries = [...(options.boundaries ?? [])].sort((a, b) => a - b);
  const paragraphs: TranscriptParagraph[] = [];

  let current: { start: number; parts: string[]; length: number; end: number } | null = null;

  const flush = () => {
    if (!current) {
      return;
    }

    const joined = current.parts.join(" ").replace(/\s+/g, " ").trim();
    const text = clean ? collapseStutter(joined) : joined;

    if (text) {
      paragraphs.push({ start: current.start, text });
    }

    current = null;
  };

  const crossesBoundary = (from: number, to: number) =>
    boundaries.some((boundary) => boundary > from && boundary <= to);

  for (const cue of cues) {
    const text = clean ? stripNoise(normalizeCueText(cue.text)) : normalizeCueText(cue.text);

    if (!text) {
      continue;
    }

    if (
      current &&
      (cue.start - current.end >= gapSeconds ||
        current.length >= maxChars ||
        crossesBoundary(current.start, cue.start))
    ) {
      flush();
    }

    if (!current) {
      current = { start: cue.start, parts: [], length: 0, end: cue.start };
    }

    const previous = current.parts[current.parts.length - 1];
    const piece = clean && previous ? dropCueOverlap(previous, text) : text;

    if (piece) {
      current.parts.push(piece);
      current.length += piece.length + 1;
    }

    current.end = cue.start + (cue.duration || 0);
  }

  flush();

  return paragraphs;
}

/** Groups paragraphs under the chapter each one starts in. */
export function applyChapters(
  paragraphs: TranscriptParagraph[],
  chapters: Chapter[],
): TranscriptSection[] {
  if (chapters.length === 0) {
    return paragraphs.length > 0 ? [{ chapter: null, paragraphs }] : [];
  }

  const sections: TranscriptSection[] = [];

  for (const paragraph of paragraphs) {
    const chapter = chapterAt(chapters, paragraph.start);
    const last = sections[sections.length - 1];

    if (last && last.chapter?.start === chapter?.start) {
      last.paragraphs.push(paragraph);
    } else {
      sections.push({ chapter, paragraphs: [paragraph] });
    }
  }

  return sections;
}

export function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

export type RenderOptions = {
  format: TranscriptFormat;
  cues: TranscriptCue[];
  chapters?: Chapter[];
  durationSeconds?: number;
};

/**
 * `clean` reads like prose, `stamps` puts a jump-back timestamp on every
 * paragraph, `raw` is the cue list exactly as the caption track had it.
 */
export function renderTranscript({
  format,
  cues,
  chapters = [],
  durationSeconds,
}: RenderOptions) {
  const withHours = (durationSeconds ?? cues[cues.length - 1]?.start ?? 0) >= 3600;

  if (format === "raw") {
    return cues
      .map((cue) => ({ start: cue.start, text: normalizeCueText(cue.text) }))
      .filter((cue) => cue.text.length > 0)
      .map((cue) => `[${formatTimestamp(cue.start, withHours)}] ${cue.text}`)
      .join("\n");
  }

  const paragraphs = mergeCuesIntoParagraphs(cues, {
    boundaries: chapters.map((chapter) => chapter.start),
  });
  const sections = applyChapters(paragraphs, chapters);
  const blocks: string[] = [];

  for (const section of sections) {
    if (section.chapter) {
      blocks.push(
        format === "stamps"
          ? `## [${formatTimestamp(section.chapter.start, withHours)}] ${section.chapter.title}`
          : `## ${section.chapter.title}`,
      );
    }

    for (const paragraph of section.paragraphs) {
      blocks.push(
        format === "stamps"
          ? `[${formatTimestamp(paragraph.start, withHours)}] ${paragraph.text}`
          : paragraph.text,
      );
    }
  }

  return blocks.join("\n\n");
}

/**
 * Cache key. Transcripts never change, so the only things that identify one
 * are the video and the language asked for; "auto" stands for "whatever the
 * video's own default track is".
 */
export function buildCacheKey(videoId: string, language?: string) {
  const normalized = (language ?? "auto").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  return `${videoId}__${normalized || "auto"}`;
}

/** Drive rejects a few characters outright and dislikes very long names. */
export function transcriptFileName(title: string, videoId: string) {
  const safe = (title || "YouTube transcript")
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .replace(/[\s.]+$/, "");

  return `${safe || "YouTube transcript"} [${videoId}].txt`;
}
