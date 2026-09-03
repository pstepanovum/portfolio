"use client";

import { useState } from "react";
import Link from "next/link";
import {
  adminBadgeClasses,
  adminInputClasses,
  adminLabelClasses,
  adminLinkClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
  adminTextareaClasses,
} from "@/components/admin/styles";
import type { DashboardSettings } from "@/types/content";

type NoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

type SettingsManagerProps = {
  initialSettings: DashboardSettings;
  geminiConfigured: boolean;
  storageBucket: string;
};

type ResumeEndpointResponse = {
  settings: DashboardSettings;
};

function buildRandomString(length: number, alphabet: string) {
  const values = new Uint32Array(length);

  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * alphabet.length);
    }
  }

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function generateResumePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const parts = Array.from({ length: 3 }, () => buildRandomString(6, alphabet));
  return parts.join("-");
}

async function getErrorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return result?.error || fallback;
}

function SettingsManager({
  initialSettings,
  geminiConfigured,
  storageBucket,
}: SettingsManagerProps) {
  const [form, setForm] = useState(initialSettings);
  const [resumeUrlInput, setResumeUrlInput] = useState(initialSettings.resumeUrl);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingResumeUrl, setIsSavingResumeUrl] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isDeletingResume, setIsDeletingResume] = useState(false);

  const copyText = async (key: string, value: string, successMessage: string) => {
    if (!value.trim()) {
      setNotice({
        tone: "error",
        message: "There is nothing to copy yet.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setNotice({
        tone: "success",
        message: successMessage,
      });
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      setNotice({
        tone: "error",
        message: "Copy failed. Try again in a secure browser tab.",
      });
    }
  };

  const applySettingsResponse = (settings: DashboardSettings) => {
    setForm(settings);
    setResumeUrlInput(settings.resumeUrl);
  };

  const handleSettingsSave = async () => {
    try {
      setIsSavingSettings(true);
      setNotice(null);

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to save the dashboard settings."),
        );
      }

      const result = (await response.json()) as ResumeEndpointResponse;
      applySettingsResponse(result.settings);
      setNotice({
        tone: "success",
        message: "Settings updated.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save the settings.",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResumeUrlSave = async () => {
    try {
      setIsSavingResumeUrl(true);
      setNotice(null);

      const body = new FormData();
      body.append("resumeUrl", resumeUrlInput);

      const response = await fetch("/api/admin/settings/resume", {
        method: "PATCH",
        body,
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to update the resume link."),
        );
      }

      const result = (await response.json()) as ResumeEndpointResponse;
      applySettingsResponse(result.settings);
      setNotice({
        tone: "success",
        message: "Resume link updated.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update the resume link.",
      });
    } finally {
      setIsSavingResumeUrl(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setNotice({
        tone: "error",
        message: "Choose a PDF file before uploading.",
      });
      return;
    }

    try {
      setIsUploadingResume(true);
      setNotice(null);

      const body = new FormData();
      body.append("resumeFile", resumeFile);

      const response = await fetch("/api/admin/settings/resume", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to upload the resume."),
        );
      }

      const result = (await response.json()) as ResumeEndpointResponse;
      applySettingsResponse(result.settings);
      setResumeFile(null);
      setNotice({
        tone: "success",
        message: "Resume uploaded.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to upload the resume.",
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleResumeDelete = async () => {
    if (!form.resumeUrl) {
      setNotice({
        tone: "error",
        message: "There is no resume to remove yet.",
      });
      return;
    }

    if (!window.confirm("Remove the current resume from the portfolio?")) {
      return;
    }

    try {
      setIsDeletingResume(true);
      setNotice(null);

      const response = await fetch("/api/admin/settings/resume", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to remove the resume."),
        );
      }

      const result = (await response.json()) as ResumeEndpointResponse;
      applySettingsResponse(result.settings);
      setResumeFile(null);
      setNotice({
        tone: "success",
        message: "Resume removed.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to remove the resume.",
      });
    } finally {
      setIsDeletingResume(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Settings</span>
        <h2 className="mt-4 text-3xl tracking-tight">
          Control AI access, resume delivery, and content tooling
        </h2>
        <p className="mt-3 max-w-3xl text-admin-muted">
          This page manages Gemini drafting, your LLM write API credentials, and
          the resume experience shown on the public contact page.
        </p>
      </section>

      {notice ? (
        <div
          className={`border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-admin-success-border bg-admin-success-bg text-admin-success-fg"
              : "border-admin-danger-border bg-admin-danger-bg text-admin-danger-fg"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-6">
          <section className={`${adminPanelClasses} p-6`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl">AI and API settings</h3>
                <p className="mt-2 max-w-2xl text-sm text-admin-muted">
                  Gemini helps draft new projects, and the keys below let trusted
                  LLM workflows read the portfolio and write new entries.
                </p>
              </div>
              <button
                type="button"
                className={adminPrimaryButtonClasses}
                onClick={handleSettingsSave}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label htmlFor="geminiModel" className={adminLabelClasses}>
                    Gemini Model
                  </label>
                  <input
                    id="geminiModel"
                    className={adminInputClasses}
                    value={form.geminiModel}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        geminiModel: event.target.value,
                      }))
                    }
                    disabled={isSavingSettings}
                  />
                </div>

                <div>
                  <label htmlFor="geminiApiKey" className={adminLabelClasses}>
                    Gemini API Key
                  </label>
                  <input
                    id="geminiApiKey"
                    type="text"
                    className={adminInputClasses}
                    value={form.geminiApiKey}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        geminiApiKey: event.target.value,
                      }))
                    }
                    disabled={isSavingSettings}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

              </div>

              <div>
                <label htmlFor="projectDraftPrompt" className={adminLabelClasses}>
                  Project Draft Prompt
                </label>
                <textarea
                  id="projectDraftPrompt"
                  className={adminTextareaClasses}
                  value={form.projectDraftPrompt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      projectDraftPrompt: event.target.value,
                    }))
                  }
                  disabled={isSavingSettings}
                />
              </div>
            </div>
          </section>

          <section className={`${adminPanelClasses} p-6`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl">Resume access</h3>
                <p className="mt-2 max-w-2xl text-sm text-admin-muted">
                  Upload your latest PDF, switch between public and password
                  protected access, and keep the current download link handy.
                </p>
              </div>
              <button
                type="button"
                className={adminPrimaryButtonClasses}
                onClick={handleSettingsSave}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? "Saving..." : "Save Access"}
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div className="flex items-start gap-3 border border-admin-border bg-admin-inset p-4">
                <input
                  id="resumeIsPublic"
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-admin-accent"
                  checked={form.resumeIsPublic}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      resumeIsPublic: event.target.checked,
                    }))
                  }
                  disabled={isSavingSettings}
                />
                <div>
                  <label htmlFor="resumeIsPublic" className="text-sm text-admin-fg">
                    Allow anyone to download the resume
                  </label>
                  <p className="mt-1 text-sm text-admin-muted">
                    When turned off, visitors must enter the password below to get
                    the current resume file.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="resumePassword" className={adminLabelClasses}>
                  Resume Password
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="resumePassword"
                    type="text"
                    className={`${adminInputClasses} min-w-[240px] flex-1`}
                    value={form.resumePassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        resumePassword: event.target.value,
                      }))
                    }
                    disabled={isSavingSettings}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className={`${adminSecondaryButtonClasses} whitespace-nowrap`}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        resumePassword: generateResumePassword(),
                      }))
                    }
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    className={`${adminSecondaryButtonClasses} whitespace-nowrap`}
                    onClick={() =>
                      copyText(
                        "resume-password",
                        form.resumePassword,
                        "Resume password copied.",
                      )
                    }
                  >
                    {copiedKey === "resume-password" ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-sm text-admin-muted">
                  Leave it as-is for private access, or turn on public downloads
                  above to skip the password entirely.
                </p>
              </div>

              <div>
                <label htmlFor="resumeUrl" className={adminLabelClasses}>
                  Current Resume URL
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="resumeUrl"
                    type="text"
                    className={`${adminInputClasses} min-w-[240px] flex-1`}
                    value={form.resumeUrl}
                    readOnly
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className={`${adminSecondaryButtonClasses} whitespace-nowrap`}
                    onClick={() =>
                      copyText(
                        "resume-url",
                        form.resumeUrl,
                        "Resume URL copied.",
                      )
                    }
                    disabled={!form.resumeUrl}
                  >
                    {copiedKey === "resume-url" ? "Copied" : "Copy"}
                  </button>
                  <a
                    href={form.resumeUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`${adminSecondaryButtonClasses} whitespace-nowrap ${
                      form.resumeUrl ? "" : "pointer-events-none opacity-60"
                    }`}
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    className={`${adminSecondaryButtonClasses} whitespace-nowrap`}
                    onClick={handleResumeDelete}
                    disabled={isDeletingResume || !form.resumeUrl}
                  >
                    {isDeletingResume ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div>
                  <label htmlFor="resumeUpload" className={adminLabelClasses}>
                    Upload PDF Resume
                  </label>
                  <input
                    id="resumeUpload"
                    type="file"
                    accept=".pdf,application/pdf"
                    className={adminInputClasses}
                    onChange={(event) =>
                      setResumeFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <button
                    type="button"
                    className={`${adminPrimaryButtonClasses} mt-3`}
                    onClick={handleResumeUpload}
                    disabled={isUploadingResume}
                  >
                    {isUploadingResume ? "Uploading..." : "Upload Resume"}
                  </button>
                </div>

                <div>
                  <label htmlFor="resumeLinkInput" className={adminLabelClasses}>
                    External Resume Link
                  </label>
                  <input
                    id="resumeLinkInput"
                    type="url"
                    className={adminInputClasses}
                    value={resumeUrlInput}
                    onChange={(event) => setResumeUrlInput(event.target.value)}
                    placeholder="https://example.com/resume.pdf"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className={`${adminSecondaryButtonClasses} mt-3`}
                    onClick={handleResumeUrlSave}
                    disabled={isSavingResumeUrl}
                  >
                    {isSavingResumeUrl ? "Saving..." : "Save Link"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${adminPanelClasses} p-6`}>
            <span className={adminBadgeClasses}>Status</span>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">
                  Gemini
                </dt>
                <dd className="mt-2 text-base text-admin-fg">
                  {geminiConfigured ? "Configured" : "Missing API key"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">
                  Storage Bucket
                </dt>
                <dd className="mt-2 break-all text-base text-admin-strong">
                  {storageBucket}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">
                  Resume
                </dt>
                <dd className="mt-2 text-base text-admin-fg">
                  {form.resumeUrl
                    ? form.resumeIsPublic
                      ? "Live and public"
                      : "Live and password protected"
                    : "Not uploaded yet"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-admin-subtle">
                  MCP servers
                </dt>
                <dd className="mt-2 text-base text-admin-strong">
                  <Link href="/dashboard/connections" className={adminLinkClasses}>Managed on the Apps page</Link>
                </dd>
              </div>
            </dl>
          </section>

          <section className={`${adminPanelClasses} p-6`}>
            <h3 className="text-xl">Quick links</h3>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/dashboard/connections" className={adminLinkClasses}>Apps and MCP servers</Link>
              <Link href="/dashboard/projects" className={adminLinkClasses}>Project manager</Link>
            </div>
          </section>
        </div>
      </div>


    </div>
  );
}

export default SettingsManager;
