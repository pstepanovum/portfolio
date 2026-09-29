/**
 * Typed failures for the transcript pipeline.
 *
 * The point of the codes is that a blocked fetch never reads as "this video
 * has no captions". Cloud Run's egress IPs are shared and YouTube throttles
 * them, which shows up as a sign-in wall or an empty caption payload; both
 * must come back as `blocked` with "try again later", never as an empty
 * transcript.
 */
export type YouTubeErrorCode =
  | "invalid_url"
  | "blocked"
  | "unavailable"
  | "no_captions"
  | "language_unavailable"
  | "network";

export class YouTubeTranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: YouTubeErrorCode,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "YouTubeTranscriptError";
  }
}

export function isBlocked(error: unknown): error is YouTubeTranscriptError {
  return error instanceof YouTubeTranscriptError && error.code === "blocked";
}
