/** Human copy for every scope, shared by the consent screen and the dashboard. */
export const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "portfolio:read":
    "Read your projects, certifications, timeline, skills, values, and resume status.",
  "portfolio:write":
    "Create, update, and delete projects, certifications, and timeline entries.",
  "gmail:read":
    "Read mail, threads, drafts, attachments, labels, and settings in every Gmail account you have connected.",
  "gmail:write":
    "Send, reply, draft, trash and permanently delete mail, and manage labels, filters, and mailbox settings in your connected Gmail accounts.",
  "google:read":
    "Read Calendar events and availability, Drive files, Sheets, Docs, Tasks, and Slides in your connected Google accounts.",
  "google:write":
    "Create and change Calendar events, Drive files and sharing, Sheets, Docs, Tasks, and Slides in your connected Google accounts.",
  "mcp:tools":
    "Use only the tools of the third-party MCP servers added on the dashboard, such as Novyn, Neural, and Luma. This does not grant Gmail, Google, or bank access; those need their own scopes.",
  "finance:read":
    "Read balances, transactions, holdings, and liabilities from the bank accounts you have linked. Read-only: no money can be moved.",
};
