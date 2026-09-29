import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyChapters,
  buildCacheKey,
  chapterAt,
  collapseStutter,
  countWords,
  decodeEntities,
  dropCueOverlap,
  formatTimestamp,
  mergeCuesIntoParagraphs,
  parseChaptersFromDescription,
  parseTimestamp,
  renderTranscript,
  stripNoise,
  transcriptFileName,
  type TranscriptCue,
} from "../lib/youtube/transcript-text";
import { parseVideoId, watchUrl } from "../lib/youtube/video-url";

const ID = "dQw4w9WgXcQ";

describe("parseVideoId", () => {
  const accepted: [string, string][] = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", ID],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1832s&list=PL123", ID],
    ["https://youtu.be/dQw4w9WgXcQ", ID],
    ["https://youtu.be/dQw4w9WgXcQ?si=abCDefGHijKL", ID],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", ID],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", ID],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?feature=share", ID],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0", ID],
    ["https://www.youtube.com/v/dQw4w9WgXcQ", ID],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", ID],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share", ID],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", ID],
    ["http://youtube.com/watch?app=desktop&v=dQw4w9WgXcQ", ID],
    ["youtube.com/watch?v=dQw4w9WgXcQ", ID],
    ["www.youtube.com/shorts/dQw4w9WgXcQ", ID],
    ["  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ", ID],
    ["dQw4w9WgXcQ", ID],
    ["https://www.youtube.com/attribution_link?a=x&u=%2Fwatch%3Fv%3DdQw4w9WgXcQ%26feature%3Dshare", ID],
  ];

  for (const [input, expected] of accepted) {
    it(`accepts ${input}`, () => {
      assert.equal(parseVideoId(input), expected);
    });
  }

  const rejected = [
    "",
    "   ",
    "https://vimeo.com/123456",
    "https://www.youtube.com/@somechannel",
    "https://www.youtube.com/playlist?list=PL123",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "not a url at all",
    "dQw4w9WgXc",
  ];

  for (const input of rejected) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      assert.equal(parseVideoId(input), null);
    });
  }

  it("builds a watch URL, with an optional start", () => {
    assert.equal(watchUrl(ID), `https://www.youtube.com/watch?v=${ID}`);
    assert.equal(watchUrl(ID, 92.7), `https://www.youtube.com/watch?v=${ID}&t=92s`);
  });
});

describe("cue text", () => {
  it("decodes entities, including double-encoded ones", () => {
    assert.equal(decodeEntities("it&amp;#39;s &quot;fine&quot;"), `it's "fine"`);
    assert.equal(decodeEntities("a &lt;b&gt; c"), "a <b> c");
  });

  it("strips caption noise", () => {
    assert.equal(stripNoise("[Music] hello [Applause] world"), "hello world");
    assert.equal(stripNoise("(upbeat music) welcome back"), "welcome back");
    assert.equal(stripNoise("♪ la la ♪"), "la la");
    assert.equal(stripNoise(">> and then he said"), "and then he said");
  });

  it("keeps bracketed words that are not sound annotations", () => {
    assert.equal(stripNoise("the [second] point"), "the [second] point");
  });
});

describe("collapseStutter", () => {
  it("drops an immediately repeated phrase", () => {
    assert.equal(
      collapseStutter("so I think so I think we should go"),
      "so I think we should go",
    );
  });

  it("ignores case and punctuation when matching", () => {
    assert.equal(collapseStutter("the thing, The thing is hard"), "the thing, is hard");
  });

  it("leaves a doubled word alone but trims longer runs", () => {
    assert.equal(collapseStutter("it was very very good"), "it was very very good");
    assert.equal(collapseStutter("no no no way"), "no no way");
  });

  it("leaves ordinary text untouched", () => {
    const text = "we talked about the market and then about the weather";
    assert.equal(collapseStutter(text), text);
  });
});

describe("dropCueOverlap", () => {
  it("removes the repeated head of the next cue", () => {
    assert.equal(dropCueOverlap("this is a test", "a test of the system"), "of the system");
  });

  it("leaves a cue that does not overlap", () => {
    assert.equal(dropCueOverlap("this is a test", "and now for something"), "and now for something");
  });
});

describe("timestamps", () => {
  it("formats under and over an hour", () => {
    assert.equal(formatTimestamp(0), "0:00");
    assert.equal(formatTimestamp(9), "0:09");
    assert.equal(formatTimestamp(65), "1:05");
    assert.equal(formatTimestamp(599.6), "9:59");
    assert.equal(formatTimestamp(3661), "1:01:01");
    assert.equal(formatTimestamp(7325), "2:02:05");
  });

  it("pads to hours when asked, so a long video stays aligned", () => {
    assert.equal(formatTimestamp(65, true), "0:01:05");
  });

  it("parses both forms back", () => {
    assert.equal(parseTimestamp("0:00"), 0);
    assert.equal(parseTimestamp("1:05"), 65);
    assert.equal(parseTimestamp("1:01:01"), 3661);
    assert.equal(parseTimestamp("nonsense"), null);
  });
});

const CUES: TranscriptCue[] = [
  { start: 0, duration: 2, text: "hello there" },
  { start: 2, duration: 2, text: "this is a test" },
  { start: 12, duration: 2, text: "after a long pause" },
];

describe("mergeCuesIntoParagraphs", () => {
  it("joins cues and breaks on a silence", () => {
    const paragraphs = mergeCuesIntoParagraphs(CUES);

    assert.deepEqual(paragraphs, [
      { start: 0, text: "hello there this is a test" },
      { start: 12, text: "after a long pause" },
    ]);
  });

  it("breaks once a paragraph passes the soft limit", () => {
    const paragraphs = mergeCuesIntoParagraphs(CUES.slice(0, 2), { maxChars: 5 });

    assert.equal(paragraphs.length, 2);
    assert.equal(paragraphs[1].start, 2);
  });

  it("never lets a paragraph straddle a chapter boundary", () => {
    const dense: TranscriptCue[] = [
      { start: 0, duration: 2, text: "first part" },
      { start: 2, duration: 2, text: "still first" },
      { start: 6, duration: 2, text: "now second" },
    ];
    const paragraphs = mergeCuesIntoParagraphs(dense, { boundaries: [5] });

    assert.deepEqual(paragraphs.map((paragraph) => paragraph.start), [0, 6]);
  });

  it("drops noise and stutter while merging, but not in raw mode", () => {
    const noisy: TranscriptCue[] = [
      { start: 0, duration: 2, text: "[Music] so I think" },
      { start: 2, duration: 2, text: "so I think we should" },
    ];

    assert.equal(mergeCuesIntoParagraphs(noisy)[0].text, "so I think we should");
    assert.equal(
      mergeCuesIntoParagraphs(noisy, { clean: false })[0].text,
      "[Music] so I think so I think we should",
    );
  });

  it("counts words on the merged text", () => {
    assert.equal(countWords("hello there this is a test"), 6);
    assert.equal(countWords("   "), 0);
  });
});

const DESCRIPTION = [
  "A long conversation about focus.",
  "",
  "0:00 Intro",
  "1:30 - The guest",
  "12:05 — Deep work",
  "",
  "Follow along at example.com",
].join("\n");

describe("chapters", () => {
  it("reads a chapter list out of the description", () => {
    assert.deepEqual(parseChaptersFromDescription(DESCRIPTION), [
      { start: 0, title: "Intro" },
      { start: 90, title: "The guest" },
      { start: 725, title: "Deep work" },
    ]);
  });

  it("accepts the trailing-timestamp style", () => {
    const description = ["Intro 0:00", "The guest - 1:30", "Deep work — 12:05"].join("\n");

    assert.deepEqual(parseChaptersFromDescription(description).map((c) => c.start), [0, 90, 725]);
  });

  it("refuses a list that does not start at zero or is too short", () => {
    assert.deepEqual(parseChaptersFromDescription("1:30 The guest\n12:05 Deep work\n20:00 End"), []);
    assert.deepEqual(parseChaptersFromDescription("0:00 Intro\n1:30 The guest"), []);
    assert.deepEqual(parseChaptersFromDescription(undefined), []);
  });

  it("ignores timestamps past the end of the video", () => {
    const chapters = parseChaptersFromDescription(DESCRIPTION, 200);

    assert.deepEqual(chapters, []);
  });

  it("maps a moment to the chapter containing it", () => {
    const chapters = parseChaptersFromDescription(DESCRIPTION);

    assert.equal(chapterAt(chapters, 0)?.title, "Intro");
    assert.equal(chapterAt(chapters, 89)?.title, "Intro");
    assert.equal(chapterAt(chapters, 90)?.title, "The guest");
    assert.equal(chapterAt(chapters, 10_000)?.title, "Deep work");
  });

  it("groups paragraphs under their chapter", () => {
    const chapters = [
      { start: 0, title: "Intro" },
      { start: 10, title: "Main" },
    ];
    const sections = applyChapters(
      [
        { start: 0, text: "one" },
        { start: 4, text: "two" },
        { start: 12, text: "three" },
      ],
      chapters,
    );

    assert.equal(sections.length, 2);
    assert.equal(sections[0].chapter?.title, "Intro");
    assert.deepEqual(sections[0].paragraphs.map((p) => p.text), ["one", "two"]);
    assert.equal(sections[1].chapter?.title, "Main");
  });

  it("returns one unnamed section when there are no chapters", () => {
    const sections = applyChapters([{ start: 0, text: "one" }], []);

    assert.equal(sections.length, 1);
    assert.equal(sections[0].chapter, null);
  });
});

describe("renderTranscript", () => {
  const chapters = [
    { start: 0, title: "Intro" },
    { start: 10, title: "Main" },
  ];

  it("renders clean paragraphs under chapter headings", () => {
    assert.equal(
      renderTranscript({ format: "clean", cues: CUES, chapters }),
      ["## Intro", "", "hello there this is a test", "", "## Main", "", "after a long pause"].join("\n"),
    );
  });

  it("puts a timestamp on every paragraph in stamps mode", () => {
    assert.equal(
      renderTranscript({ format: "stamps", cues: CUES, chapters }),
      [
        "## [0:00] Intro",
        "",
        "[0:00] hello there this is a test",
        "",
        "## [0:10] Main",
        "",
        "[0:12] after a long pause",
      ].join("\n"),
    );
  });

  it("uses hour-padded stamps for a long video", () => {
    const text = renderTranscript({ format: "stamps", cues: CUES, durationSeconds: 7200 });

    assert.ok(text.startsWith("[0:00:00] "));
  });

  it("returns the cue list in raw mode", () => {
    assert.equal(
      renderTranscript({ format: "raw", cues: CUES }),
      ["[0:00] hello there", "[0:02] this is a test", "[0:12] after a long pause"].join("\n"),
    );
  });
});

describe("cache key and file name", () => {
  it("keys on video and language, with auto for an unspecified one", () => {
    assert.equal(buildCacheKey(ID, "en"), `${ID}__en`);
    assert.equal(buildCacheKey(ID, "en-US"), `${ID}__en-us`);
    assert.equal(buildCacheKey(ID, "pt_BR"), `${ID}__pt-br`);
    assert.equal(buildCacheKey(ID), `${ID}__auto`);
    assert.equal(buildCacheKey(ID, "  "), `${ID}__auto`);
  });

  it("never produces a key with a path separator in it", () => {
    assert.ok(!buildCacheKey(ID, "en/US").includes("/"));
  });

  it("builds a Drive-safe file name from the title and id", () => {
    assert.equal(
      transcriptFileName('Deep Work: Focus / "Rules"', ID),
      `Deep Work Focus Rules [${ID}].txt`,
    );
    assert.equal(transcriptFileName("", ID), `YouTube transcript [${ID}].txt`);
    assert.ok(transcriptFileName("x".repeat(400), ID).length < 150);
  });
});
