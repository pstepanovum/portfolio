"use client";

import { useEffect, useState } from "react";

type ResumeAccessState = {
  available: boolean;
  isPublic: boolean;
  requiresPassword: boolean;
};

type NoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return result?.error || fallback;
}

export default function ResumeDownload() {
  const [access, setAccess] = useState<ResumeAccessState | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/resume-access", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Unable to load resume access."),
          );
        }

        const result = (await response.json()) as ResumeAccessState;

        if (!active) {
          return;
        }

        setAccess(result);
      } catch (error) {
        if (!active) {
          return;
        }

        setNotice({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load resume access.",
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadAccess();

    return () => {
      active = false;
    };
  }, []);

  const handleDownload = async () => {
    if (!access?.available) {
      return;
    }

    try {
      setIsSubmitting(true);
      setNotice(null);

      const response = await fetch("/api/resume-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: access.isPublic ? undefined : password,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to open the resume right now."),
        );
      }

      const result = (await response.json()) as { url: string };
      const openedWindow = window.open(result.url, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        throw new Error("Please allow pop-ups to open the resume.");
      }

      setNotice({
        tone: "success",
        message: access.isPublic
          ? "Resume opened in a new tab."
          : "Password accepted. Resume opened in a new tab.",
      });
      setPassword("");
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to open the resume right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p className="text-white/60">Checking resume access...</p>;
  }

  if (!access?.available) {
    return (
      <div className="space-y-3">
        <p className="text-white/70">
          Resume download is not available right now. Please check back soon.
        </p>
        {notice ? (
          <p
            className={`text-sm ${
              notice.tone === "success" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {notice.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-white/70">
          {access.isPublic
            ? "The latest resume is available for direct download."
            : "This resume is password protected. Enter the password to continue."}
        </p>
      </div>

      {access.requiresPassword ? (
        <div className="space-y-3">
          <label htmlFor="resume-password" className="text-sm text-white/60">
            Enter Password
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                id="resume-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Resume password"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              className="border border-white/10 px-4 py-3 text-sm text-white/80 transition-colors hover:bg-white/10"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p
          className={`text-sm ${
            notice.tone === "success" ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {notice.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleDownload}
        disabled={isSubmitting || (access.requiresPassword && password.trim().length === 0)}
        className="inline-flex w-full items-center justify-center border border-white/10 bg-white/10 px-6 py-4 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Opening..." : "Download Resume"}
      </button>
    </div>
  );
}
