"use client";

import { useState } from "react";
import Image from "next/image";
import type { PortfolioCertification } from "@/types/content";
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

type CertificationFormState = {
  id: string | null;
  title: string;
  issuer: string;
  date: string;
  credentialId: string;
  skills: string;
  verificationUrl: string;
  logo: string;
  order: string;
};

type NoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

function createEmptyForm(): CertificationFormState {
  return {
    id: null,
    title: "",
    issuer: "",
    date: "",
    credentialId: "",
    skills: "",
    verificationUrl: "",
    logo: "",
    order: "0",
  };
}

function toFormState(certification: PortfolioCertification): CertificationFormState {
  return {
    id: certification.id,
    title: certification.title,
    issuer: certification.issuer,
    date: certification.date,
    credentialId: certification.credentialId ?? "",
    skills: (certification.skills ?? []).join(", "),
    verificationUrl: certification.verificationUrl ?? "",
    logo: certification.logo ?? "",
    order: String(certification.order),
  };
}

function sortCertifications(certifications: PortfolioCertification[]) {
  return [...certifications].sort((left, right) => left.order - right.order);
}

async function getErrorMessage(response: Response) {
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return result?.error || "Something went wrong while saving the certification.";
}

export default function CertificationManager({
  initialCertifications,
}: {
  initialCertifications: PortfolioCertification[];
}) {
  const [certifications, setCertifications] = useState(
    sortCertifications(initialCertifications),
  );
  const [form, setForm] = useState<CertificationFormState>(createEmptyForm());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const isEditing = Boolean(form.id);

  const resetForm = () => {
    setForm(createEmptyForm());
    setLogoFile(null);
  };

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setNotice(null);

      const body = new FormData();
      body.append("title", form.title);
      body.append("issuer", form.issuer);
      body.append("date", form.date);
      body.append("credentialId", form.credentialId);
      body.append("skills", form.skills);
      body.append("verificationUrl", form.verificationUrl);
      body.append("logo", form.logo);
      body.append("order", form.order);

      if (logoFile) {
        body.append("logoFile", logoFile);
      }

      const response = await fetch(
        form.id
          ? `/api/admin/certifications/${form.id}`
          : "/api/admin/certifications",
        {
          method: form.id ? "PATCH" : "POST",
          body,
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result = (await response.json()) as {
        certification: PortfolioCertification;
      };

      setCertifications((current) => {
        const next = form.id
          ? current.map((certification) =>
              certification.id === result.certification.id
                ? result.certification
                : certification,
            )
          : [...current, result.certification];

        return sortCertifications(next);
      });

      setNotice({
        tone: "success",
        message: isEditing
          ? "Certification updated successfully."
          : "Certification created successfully.",
      });
      resetForm();
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save the certification.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (certification: PortfolioCertification) => {
    if (!window.confirm(`Delete "${certification.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/certifications/${certification.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setCertifications((current) =>
        current.filter((item) => item.id !== certification.id),
      );
      setNotice({
        tone: "success",
        message: "Certification deleted.",
      });

      if (form.id === certification.id) {
        resetForm();
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the certification.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Certifications</span>
        <h2 className="mt-4 text-3xl tracking-tight">Manage certifications and badges</h2>
        <p className="mt-3 max-w-3xl text-white/65">
          Keep your credentials current with logos, verification links, and the
          skills each certification represents.
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
                {isEditing ? "Edit certification" : "New certification"}
              </h3>
              <p className="mt-2 text-sm text-white/60">
                Save the same structured data used on the skills page.
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

              <div>
                <label htmlFor="issuer" className={adminLabelClasses}>
                  Issuer
                </label>
                <input
                  id="issuer"
                  name="issuer"
                  className={adminInputClasses}
                  value={form.issuer}
                  onChange={handleChange}
                  required
                  disabled={isSaving}
                />
              </div>

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
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <label htmlFor="credentialId" className={adminLabelClasses}>
                  Credential ID
                </label>
                <input
                  id="credentialId"
                  name="credentialId"
                  className={adminInputClasses}
                  value={form.credentialId}
                  onChange={handleChange}
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

              <div className="md:col-span-2">
                <label htmlFor="skills" className={adminLabelClasses}>
                  Skills
                </label>
                <textarea
                  id="skills"
                  name="skills"
                  className={adminTextareaClasses}
                  value={form.skills}
                  onChange={handleChange}
                  placeholder="Comma-separated or one skill per line"
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="verificationUrl" className={adminLabelClasses}>
                  Verification URL
                </label>
                <input
                  id="verificationUrl"
                  name="verificationUrl"
                  type="url"
                  className={adminInputClasses}
                  value={form.verificationUrl}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="logo" className={adminLabelClasses}>
                  Logo URL
                </label>
                <input
                  id="logo"
                  name="logo"
                  className={adminInputClasses}
                  value={form.logo}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="logoFile" className={adminLabelClasses}>
                  Upload Logo
                </label>
                <input
                  id="logoFile"
                  type="file"
                  accept="image/*"
                  className={adminInputClasses}
                  onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  disabled={isSaving}
                />
              </div>
            </div>

            {form.logo ? (
              <div className="border border-white/10 bg-black/40 p-4">
                <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
                  Current Logo
                </div>
                <Image
                  src={form.logo}
                  alt={form.title || "Certification logo"}
                  width={80}
                  height={80}
                  className="h-20 w-20 object-contain"
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
                    ? "Update certification"
                    : "Create certification"}
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
              <h3 className="text-xl">Existing certifications</h3>
              <p className="mt-2 text-sm text-white/60">
                Select a certification to load it into the editor.
              </p>
            </div>
            <span className={adminBadgeClasses}>{certifications.length} total</span>
          </div>

          <div className="mt-6 space-y-4">
            {certifications.map((certification) => (
              <article
                key={certification.id}
                className="border border-white/10 bg-black/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                      Order {certification.order}
                    </div>
                    <h4 className="text-lg">{certification.title}</h4>
                    <p className="text-sm text-white/55">
                      {certification.issuer} • {certification.date}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={adminSecondaryButtonClasses}
                      onClick={() => {
                        setForm(toFormState(certification));
                        setLogoFile(null);
                        setNotice(null);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={adminDangerButtonClasses}
                      onClick={() => handleDelete(certification)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {(certification.skills ?? []).length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(certification.skills ?? []).map((skill) => (
                      <span
                        key={`${certification.id}-${skill}`}
                        className="border border-white/10 px-2 py-1 text-xs text-white/60"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
