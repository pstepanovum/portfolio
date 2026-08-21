"use client";

import { useState } from "react";
import type { ContactSubmission } from "@/types/content";
import {
  adminBadgeClasses,
  adminDangerButtonClasses,
  adminInputClasses,
  adminPanelClasses,
  adminSecondaryButtonClasses,
} from "@/components/admin/styles";

type NoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

function formatDateTime(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getErrorMessage(response: Response) {
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return result?.error || "Unable to update the contact.";
}

export default function ContactManager({
  initialContacts,
}: {
  initialContacts: ContactSubmission[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const totals = {
    all: contacts.length,
    unread: contacts.filter((contact) => contact.status === "new").length,
    read: contacts.filter((contact) => contact.status === "read").length,
    archived: contacts.filter((contact) => contact.status === "archived").length,
  };

  const updateStatus = async (
    contact: ContactSubmission,
    status: ContactSubmission["status"],
  ) => {
    try {
      setUpdatingId(contact.id);
      setNotice(null);

      const response = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result = (await response.json()) as { contact: ContactSubmission };

      setContacts((current) =>
        current.map((item) => (item.id === result.contact.id ? result.contact : item)),
      );
      setNotice({
        tone: "success",
        message: `Updated ${contact.name}'s message to ${status}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to update the contact.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (contact: ContactSubmission) => {
    if (!window.confirm(`Delete contact from ${contact.name}?`)) {
      return;
    }

    try {
      setUpdatingId(contact.id);
      setNotice(null);

      const response = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setContacts((current) =>
        current.filter((currentContact) => currentContact.id !== contact.id),
      );
      setNotice({
        tone: "success",
        message: `Deleted ${contact.name}'s message.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to delete the contact.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${adminPanelClasses} p-6`}>
        <span className={adminBadgeClasses}>Contacts</span>
        <h2 className="mt-4 text-3xl tracking-tight">Review contact submissions</h2>
        <p className="mt-3 max-w-3xl text-admin-muted">
          Messages from the public contact form land here in Firestore so you can
          track new, read, and archived inquiries.
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

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "All", value: totals.all },
          { label: "Unread", value: totals.unread },
          { label: "Read", value: totals.read },
          { label: "Archived", value: totals.archived },
        ].map((metric) => (
          <div key={metric.label} className={`${adminPanelClasses} p-5`}>
            <div className="text-xs uppercase tracking-[0.22em] text-admin-subtle">
              {metric.label}
            </div>
            <div className="mt-4 text-4xl tracking-tight">{metric.value}</div>
          </div>
        ))}
      </section>

      <section className={`${adminPanelClasses} p-6`}>
        {contacts.length === 0 ? (
          <p className="text-admin-muted">No contact submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="border border-admin-border bg-admin-inset p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-admin-subtle">
                      <span>{contact.status}</span>
                      <span>{formatDateTime(contact.createdAt)}</span>
                    </div>
                    <div>
                      <h3 className="text-xl">{contact.subject}</h3>
                      <p className="mt-2 text-sm text-admin-muted">
                        {contact.name} •{" "}
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-admin-fg underline underline-offset-4"
                        >
                          {contact.email}
                        </a>
                      </p>
                    </div>
                    <p className="max-w-3xl whitespace-pre-wrap text-sm text-admin-strong">
                      {contact.message}
                    </p>
                  </div>

                  <div className="w-full max-w-[220px] space-y-3">
                    <div>
                      <label
                        htmlFor={`status-${contact.id}`}
                        className="mb-2 block text-xs uppercase tracking-[0.2em] text-admin-subtle"
                      >
                        Status
                      </label>
                      <select
                        id={`status-${contact.id}`}
                        className={adminInputClasses}
                        value={contact.status}
                        onChange={(event) =>
                          updateStatus(
                            contact,
                            event.target.value as ContactSubmission["status"],
                          )
                        }
                        disabled={updatingId === contact.id}
                      >
                        {["new", "read", "archived"].map((status) => (
                          <option key={status} value={status} className="bg-admin-bg">
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`mailto:${contact.email}`}
                        className={`${adminSecondaryButtonClasses} flex-1 justify-center`}
                      >
                        Reply
                      </a>
                      <button
                        type="button"
                        className={`${adminDangerButtonClasses} flex-1 justify-center`}
                        onClick={() => handleDelete(contact)}
                        disabled={updatingId === contact.id}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
