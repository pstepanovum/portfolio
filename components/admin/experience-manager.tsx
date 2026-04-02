"use client";

import { useState } from "react";
import type { PortfolioExperience } from "@/types/content";
import {
  adminBadgeClasses,
  adminDangerButtonClasses,
  adminInputClasses,
  adminLabelClasses,
  adminPanelClasses,
  adminPrimaryButtonClasses,
  adminSecondaryButtonClasses,
  adminTextareaClasses,
} from "@/components/admin/styles";

type ExperienceFormState = {
  id: string | null;
  date: string;
  title: string;
  company: string;
  description: string;
  location: string;
  type: string;
  achievements: string;
  tech: string;
  order: string;
};

type NoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

function createEmptyForm(): ExperienceFormState {
  return {
    id: null,
    date: "",
    title: "",
    company: "",
    description: "",
    location: "",
    type: "",
    achievements: "",
    tech: "",
    order: "0",
  };
}

function toFormState(experience: PortfolioExperience): ExperienceFormState {
  return {
    id: experience.id,
    date: experience.date,
    title: experience.title,
    company: experience.company,
    description: experience.description,
    location: experience.location ?? "",
    type: experience.type ?? "",
    achievements: (experience.achievements ?? []).join("\n"),
    tech: (experience.tech ?? []).join(", "),
    order: String(experience.order),
  };
}

function sortExperiences(experiences: PortfolioExperience[]) {
  return [...experiences].sort((left, right) => left.order - right.order);
}

async function getErrorMessage(response: Response) {
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return result?.error || "Something went wrong while saving the timeline entry.";
}

export default function ExperienceManager({
  initialExperiences,
}: {
  initialExperiences: PortfolioExperience[];
}) {
  const [experiences, setExperiences] = useState(
    sortExperiences(initialExperiences),
  );
  const [form, setForm] = useState<ExperienceFormState>(createEmptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const isEditing = Boolean(form.id);

  const resetForm = () => {
    setForm(createEmptyForm());
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setNotice(null);

      const response = await fetch(
        form.id ? `/api/admin/experience/${form.id}` : "/api/admin/experience",
        {
          method: form.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: form.date,
            title: form.title,
            company: form.company,
            description: form.description,
            location: form.location,
            type: form.type,
            achievements: form.achievements,
            tech: form.tech,
            order: form.order,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result = (await response.json()) as { experience: PortfolioExperience };

      setExperiences((current) => {
        const next = form.id
          ? current.map((experience) =>
              experience.id === result.experience.id
                ? result.experience
                : experience,
            )
          : [...current, result.experience];

        return sortExperiences(next);
      });

      setNotice({
        tone: "success",
        message: isEditing
          ? "Timeline entry updated successfully."
          : "Timeline entry created successfully.",
      });
      resetForm();
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the timeline entry.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (experience: PortfolioExperience) => {
    if (!window.confirm(`Delete "${experience.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/experience/${experience.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setExperiences((current) =>
        current.filter((item) => item.id !== experience.id),
      );
      setNotice({
        tone: "success",
        message: "Timeline entry deleted.",
      });

      if (form.id === experience.id) {
        resetForm();
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the timeline entry.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Timeline</span>
        <h2 className="mt-4 text-3xl tracking-tight">Manage about-page experience</h2>
        <p className="mt-3 max-w-3xl text-white/65">
          Update the work history shown on the about page, including supporting
          achievements and technologies.
        </p>
      </section>

      {notice ? (
        <div
          className={`border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className={`${adminPanelClasses} p-6`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl">
                {isEditing ? "Edit timeline entry" : "New timeline entry"}
              </h3>
              <p className="mt-2 text-sm text-white/60">
                These entries drive the timeline on your about page.
              </p>
            </div>
            {isEditing ? (
              <button
                type="button"
                className={adminSecondaryButtonClasses}
                onClick={resetForm}
              >
                Clear form
              </button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="date" className={adminLabelClasses}>
                  Date
                </label>
                <input
                  id="date"
                  name="date"
                  className={adminInputClasses}
                  value={form.date}
                  onChange={handleChange}
                  placeholder="Apr 2026 - Present"
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="order" className={adminLabelClasses}>
                  Order
                </label>
                <input
                  id="order"
                  name="order"
                  type="number"
                  min="0"
                  className={adminInputClasses}
                  value={form.order}
                  onChange={handleChange}
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="title" className={adminLabelClasses}>
                  Role
                </label>
                <input
                  id="title"
                  name="title"
                  className={adminInputClasses}
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Founder & Full Stack Engineer"
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="company" className={adminLabelClasses}>
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  className={adminInputClasses}
                  value={form.company}
                  onChange={handleChange}
                  placeholder="Pavel Stepanov Portfolio"
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="location" className={adminLabelClasses}>
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  className={adminInputClasses}
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Miami, FL"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="type" className={adminLabelClasses}>
                  Type
                </label>
                <input
                  id="type"
                  name="type"
                  className={adminInputClasses}
                  value={form.type}
                  onChange={handleChange}
                  placeholder="Independent, Full-time, Contract, Academic Research"
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className={adminLabelClasses}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className={adminTextareaClasses}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Summarize the work, scope, and outcome that should appear on the public about page."
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="achievements" className={adminLabelClasses}>
                  Achievements
                </label>
                <textarea
                  id="achievements"
                  name="achievements"
                  className={adminTextareaClasses}
                  value={form.achievements}
                  onChange={handleChange}
                  placeholder={"One achievement per line\nBuilt a private portfolio CMS\nAdded AI-assisted content workflows"}
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tech" className={adminLabelClasses}>
                  Technologies
                </label>
                <textarea
                  id="tech"
                  name="tech"
                  className={adminTextareaClasses}
                  value={form.tech}
                  onChange={handleChange}
                  placeholder="Next.js, Firebase, TypeScript, Gemini"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className={adminPrimaryButtonClasses}
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Update timeline entry"
                    : "Create timeline entry"}
              </button>
              <button
                type="button"
                className={adminSecondaryButtonClasses}
                onClick={resetForm}
                disabled={isSaving}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className={`${adminPanelClasses} p-6`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl">Existing timeline entries</h3>
              <p className="mt-2 text-sm text-white/60">
                Use edit to load an entry back into the form.
              </p>
            </div>
            <span className={adminBadgeClasses}>{experiences.length} total</span>
          </div>

          <div className="mt-6 space-y-4">
            {experiences.map((experience) => (
              <article
                key={experience.id}
                className="border border-white/10 bg-black/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                      {experience.date} • order {experience.order}
                    </div>
                    <h4 className="text-lg">{experience.title}</h4>
                    <p className="text-sm text-white/55">
                      {experience.company}
                      {experience.location ? ` • ${experience.location}` : ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={adminSecondaryButtonClasses}
                      onClick={() => {
                        setForm(toFormState(experience));
                        setNotice(null);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={adminDangerButtonClasses}
                      onClick={() => handleDelete(experience)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-4 line-clamp-4 text-sm text-white/55">
                  {experience.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
