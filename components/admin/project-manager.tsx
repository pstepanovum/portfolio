"use client";

import { useState } from "react";
import Image from "next/image";
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
import { projectCategories, type PortfolioProject, type ProjectCategory } from "@/types/content";

type ProjectFormState = {
  id: string | null;
  title: string;
  description: string;
  tags: string;
  category: ProjectCategory;
  github: string;
  demo: string;
  image: string;
  order: string;
};

type NoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

const categoryOrder: ProjectCategory[] = ["featured", "webApps", "ai"];

function createEmptyForm(): ProjectFormState {
  return {
    id: null,
    title: "",
    description: "",
    tags: "",
    category: "featured",
    github: "",
    demo: "",
    image: "",
    order: "0",
  };
}

function toFormState(project: PortfolioProject): ProjectFormState {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: project.tags.join(", "),
    category: project.category,
    github: project.github ?? "",
    demo: project.demo ?? "",
    image: project.image,
    order: String(project.order),
  };
}

function sortProjects(projects: PortfolioProject[]) {
  return [...projects].sort((left, right) => {
    const categoryDiff =
      categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category);

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    return left.order - right.order;
  });
}

async function getErrorMessage(response: Response) {
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return result?.error || "Something went wrong while saving the project.";
}

export default function ProjectManager({
  initialProjects,
}: {
  initialProjects: PortfolioProject[];
}) {
  const [projects, setProjects] = useState(sortProjects(initialProjects));
  const [form, setForm] = useState<ProjectFormState>(createEmptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const isEditing = Boolean(form.id);

  const resetForm = () => {
    setForm(createEmptyForm());
    setImageFile(null);
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleGenerateDraft = async () => {
    if (draftNotes.trim().length < 10) {
      setNotice({
        tone: "error",
        message: "Add a few notes first so Gemini has enough context to work with.",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setNotice(null);

      const response = await fetch("/api/admin/gemini/project-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: draftNotes }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const draft = (await response.json()) as {
        draft: {
          title: string;
          description: string;
          tags: string[];
          category: ProjectCategory;
          github?: string;
          demo?: string;
        };
      };

      setForm((current) => ({
        ...current,
        title: draft.draft.title,
        description: draft.draft.description,
        tags: draft.draft.tags.join(", "),
        category: draft.draft.category,
        github: draft.draft.github ?? "",
        demo: draft.draft.demo ?? "",
      }));
      setNotice({
        tone: "success",
        message: "Draft generated. Review it and add any final details before saving.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Gemini could not generate a project draft right now.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setNotice(null);

      const body = new FormData();
      body.append("title", form.title);
      body.append("description", form.description);
      body.append("tags", form.tags);
      body.append("category", form.category);
      body.append("github", form.github);
      body.append("demo", form.demo);
      body.append("image", form.image);
      body.append("order", form.order);

      if (imageFile) {
        body.append("imageFile", imageFile);
      }

      const response = await fetch(
        form.id ? `/api/admin/projects/${form.id}` : "/api/admin/projects",
        {
          method: form.id ? "PATCH" : "POST",
          body,
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result = (await response.json()) as { project: PortfolioProject };

      setProjects((current) => {
        const next = form.id
          ? current.map((project) =>
              project.id === result.project.id ? result.project : project,
            )
          : [...current, result.project];

        return sortProjects(next);
      });

      setNotice({
        tone: "success",
        message: form.id
          ? "Project updated successfully."
          : "Project created successfully.",
      });
      resetForm();
      setDraftNotes("");
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the project right now.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (project: PortfolioProject) => {
    setForm(toFormState(project));
    setImageFile(null);
    setNotice(null);
  };

  const handleDelete = async (project: PortfolioProject) => {
    if (!window.confirm(`Delete "${project.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setProjects((current) =>
        current.filter((currentProject) => currentProject.id !== project.id),
      );
      setNotice({
        tone: "success",
        message: "Project deleted.",
      });

      if (form.id === project.id) {
        resetForm();
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the project.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Projects</span>
        <h2 className="mt-4 text-3xl tracking-tight">Manage portfolio projects</h2>
        <p className="mt-3 max-w-3xl text-white/65">
          Keep the featured work, web apps, and AI sections current. Upload new
          images to Firebase Storage or keep an existing image URL when needed.
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className={`${adminPanelClasses} space-y-6 p-6`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl">{isEditing ? "Edit project" : "New project"}</h3>
              <p className="mt-2 text-sm text-white/60">
                Fill in the same fields your public project cards already use.
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

          <div className="border border-white/10 bg-black/40 p-5">
            <label htmlFor="draft-notes" className={adminLabelClasses}>
              Gemini Draft Notes
            </label>
            <textarea
              id="draft-notes"
              className={adminTextareaClasses}
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              placeholder="Paste rough notes, metrics, tech stack, links, and the kind of project this is."
              disabled={isGenerating || isSaving}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className={adminPrimaryButtonClasses}
                onClick={handleGenerateDraft}
                disabled={isGenerating || isSaving}
              >
                {isGenerating ? "Generating..." : "Generate with Gemini"}
              </button>
              <p className="max-w-lg text-sm text-white/50">
                This fills title, description, tags, category, and links. Review
                the content before saving.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="title" className={adminLabelClasses}>
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  className={adminInputClasses}
                  value={form.title}
                  onChange={handleChange}
                  required
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
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="tags" className={adminLabelClasses}>
                  Tags
                </label>
                <textarea
                  id="tags"
                  name="tags"
                  className={adminTextareaClasses}
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="Comma-separated or one tag per line"
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="category" className={adminLabelClasses}>
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  className={adminInputClasses}
                  value={form.category}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  {projectCategories.map((category) => (
                    <option key={category} value={category} className="bg-black">
                      {category}
                    </option>
                  ))}
                </select>
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
                <label htmlFor="github" className={adminLabelClasses}>
                  GitHub URL
                </label>
                <input
                  id="github"
                  name="github"
                  type="url"
                  className={adminInputClasses}
                  value={form.github}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="demo" className={adminLabelClasses}>
                  Demo URL
                </label>
                <input
                  id="demo"
                  name="demo"
                  type="url"
                  className={adminInputClasses}
                  value={form.demo}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="image" className={adminLabelClasses}>
                  Image URL
                </label>
                <input
                  id="image"
                  name="image"
                  className={adminInputClasses}
                  value={form.image}
                  onChange={handleChange}
                  placeholder="/images/page/projects/example.png or a remote URL"
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="imageFile" className={adminLabelClasses}>
                  Upload Image
                </label>
                <input
                  id="imageFile"
                  name="imageFile"
                  type="file"
                  accept="image/*"
                  className={adminInputClasses}
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                  disabled={isSaving}
                />
                <p className="mt-2 text-xs text-white/45">
                  Uploading a file replaces the image URL with a Firebase Storage
                  asset.
                </p>
              </div>
            </div>

            {form.image ? (
              <div className="border border-white/10 bg-black/40 p-4">
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
                  Current Image
                </div>
                <Image
                  src={form.image}
                  alt={form.title || "Project preview"}
                  width={1200}
                  height={675}
                  className="h-48 w-full object-cover"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className={adminPrimaryButtonClasses}
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Update project"
                    : "Create project"}
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
              <h3 className="text-xl">Existing projects</h3>
              <p className="mt-2 text-sm text-white/60">
                Click edit to load a project into the form.
              </p>
            </div>
            <span className={adminBadgeClasses}>{projects.length} total</span>
          </div>

          <div className="mt-6 space-y-4">
            {projects.map((project) => (
              <article key={project.id} className="border border-white/10 bg-black/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
                      <span>{project.category}</span>
                      <span>Order {project.order}</span>
                    </div>
                    <h4 className="text-lg">{project.title}</h4>
                    <p className="line-clamp-3 text-sm text-white/55">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={adminSecondaryButtonClasses}
                      onClick={() => handleEdit(project)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={adminDangerButtonClasses}
                      onClick={() => handleDelete(project)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={`${project.id}-${tag}`}
                      className="border border-white/10 px-2 py-1 text-xs text-white/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
