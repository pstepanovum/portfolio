import "server-only";

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as calendar from "@/lib/connections/calendar";
import * as docs from "@/lib/connections/docs";
import * as drive from "@/lib/connections/drive";
import * as sheets from "@/lib/connections/sheets";
import * as slides from "@/lib/connections/slides";
import * as tasks from "@/lib/connections/tasks";
import {
  DESTRUCTIVE,
  IDEMPOTENT_WRITE,
  READ_ONLY,
  WRITE,
  accountField,
  withAccount,
} from "@/lib/mcp/tools/gmail-shared";

const calendarId = z.string().trim().min(1).optional().describe('Calendar id; defaults to "primary". Use list_calendars for others.');
const isoTime = z.string().trim().min(4).describe("RFC 3339 date-time, e.g. 2026-09-04T15:00:00-04:00; for all-day events a date, 2026-09-04.");
const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const rows = z.array(z.array(cell)).min(1).max(1000).describe("Rows of cell values.");

// ---------------------------------------------------------------- Calendar
export function registerCalendarReadTools(server: McpServer) {
  server.registerTool("list_calendars", { title: "List calendars", description: "Calendars the account can see, with ids and access roles.", inputSchema: { account: accountField }, annotations: READ_ONLY },
    async ({ account }) => withAccount(account, async (t) => ({ calendars: await calendar.listCalendars(t) })));

  server.registerTool("list_events", {
    title: "List events",
    description: "Upcoming events from a calendar, expanded and ordered by start time. Defaults to now onwards; set timeMin/timeMax to look at a window, or query to text-search.",
    inputSchema: { account: accountField, calendarId, timeMin: isoTime.optional(), timeMax: isoTime.optional(), query: z.string().max(200).optional(), maxResults: z.number().int().min(1).max(250).optional(), pageToken: z.string().optional() },
    annotations: READ_ONLY,
  }, async ({ account, ...input }) => withAccount(account, (t) => calendar.listEvents(t, input)));

  server.registerTool("get_event", { title: "Get event", description: "One event in full, including attendees and any Meet link.", inputSchema: { account: accountField, calendarId, eventId: z.string().trim().min(1) }, annotations: READ_ONLY },
    async ({ account, calendarId: cal, eventId }) => withAccount(account, async (t) => ({ event: await calendar.getEvent(t, cal ?? "primary", eventId) })));

  server.registerTool("get_free_busy", { title: "Get free/busy", description: "Busy intervals across calendars in a window; the complement is free time.", inputSchema: { account: accountField, timeMin: isoTime, timeMax: isoTime, calendarIds: z.array(z.string()).max(20).optional() }, annotations: READ_ONLY },
    async ({ account, ...input }) => withAccount(account, async (t) => ({ calendars: await calendar.getFreeBusy(t, input) })));
}

export function registerCalendarWriteTools(server: McpServer) {
  const eventFields = {
    summary: z.string().trim().max(500).optional(),
    description: z.string().max(8000).optional(),
    location: z.string().max(500).optional(),
    start: isoTime.optional(),
    end: isoTime.optional(),
    timeZone: z.string().optional().describe("IANA zone for start/end, e.g. America/New_York."),
    allDay: z.boolean().optional(),
    attendees: z.array(z.string().email()).max(100).optional().describe("Invitations are sent."),
    addMeetLink: z.boolean().optional().describe("Attach a Google Meet link."),
  };

  server.registerTool("create_event", { title: "Create event", description: "Create a calendar event, optionally with attendees (invited by email) and a Google Meet link. Confirm the time zone with the user.", inputSchema: { account: accountField, calendarId, ...eventFields, summary: z.string().trim().min(1).max(500), start: isoTime, end: isoTime }, annotations: WRITE },
    async ({ account, calendarId: cal, ...input }) => withAccount(account, async (t) => ({ event: await calendar.createEvent(t, cal ?? "primary", input) })));

  server.registerTool("quick_add_event", { title: "Quick-add event", description: 'Create an event from natural language using Calendar\'s own parser, e.g. "Lunch with Ann Friday 1pm".', inputSchema: { account: accountField, calendarId, text: z.string().trim().min(3).max(300) }, annotations: WRITE },
    async ({ account, calendarId: cal, text }) => withAccount(account, async (t) => ({ event: await calendar.quickAddEvent(t, cal ?? "primary", text) })));

  server.registerTool("update_event", { title: "Update event", description: "Change fields on an event; only supplied fields change. Attendees are notified.", inputSchema: { account: accountField, calendarId, eventId: z.string().trim().min(1), ...eventFields }, annotations: IDEMPOTENT_WRITE },
    async ({ account, calendarId: cal, eventId, ...input }) => withAccount(account, async (t) => ({ event: await calendar.updateEvent(t, cal ?? "primary", eventId, input) })));

  server.registerTool("delete_event", { title: "Delete event", description: "Delete an event and notify attendees. Confirm first.", inputSchema: { account: accountField, calendarId, eventId: z.string().trim().min(1) }, annotations: DESTRUCTIVE },
    async ({ account, calendarId: cal, eventId }) => withAccount(account, async (t) => { await calendar.deleteEvent(t, cal ?? "primary", eventId); return { deleted: true, eventId }; }));
}

// ---------------------------------------------------------------- Drive
export function registerDriveReadTools(server: McpServer) {
  server.registerTool("search_files", {
    title: "Search Drive",
    description: "Search Drive with the files.list query syntax (name contains 'x', mimeType = '...', fullText contains 'x', modifiedTime > '2026-01-01'). Omit query to list recent files; set folderId to list a folder.",
    inputSchema: { account: accountField, query: z.string().max(500).optional(), folderId: z.string().optional(), pageSize: z.number().int().min(1).max(100).optional(), pageToken: z.string().optional(), orderBy: z.string().optional(), includeTrashed: z.boolean().optional() },
    annotations: READ_ONLY,
  }, async ({ account, ...input }) => withAccount(account, (t) => drive.searchFiles(t, input)));

  server.registerTool("get_file", { title: "Get file metadata", description: "Name, type, size, parents, owner, and link for a file or folder.", inputSchema: { account: accountField, fileId: z.string().trim().min(1) }, annotations: READ_ONLY },
    async ({ account, fileId }) => withAccount(account, async (t) => ({ file: await drive.getFile(t, fileId) })));

  server.registerTool("download_file", { title: "Download file contents", description: "Google Docs export as text, Sheets as CSV, Slides as text; other text files as text; binaries as base64 (up to 10 MB).", inputSchema: { account: accountField, fileId: z.string().trim().min(1) }, annotations: READ_ONLY },
    async ({ account, fileId }) => withAccount(account, (t) => drive.downloadFile(t, fileId)));
}

export function registerDriveWriteTools(server: McpServer) {
  server.registerTool("create_folder", { title: "Create folder", description: "Create a Drive folder, optionally inside another.", inputSchema: { account: accountField, name: z.string().trim().min(1).max(255), parentId: z.string().optional() }, annotations: WRITE },
    async ({ account, name, parentId }) => withAccount(account, async (t) => ({ folder: await drive.createFolder(t, name, parentId) })));

  server.registerTool("upload_text_file", { title: "Upload a text file", description: "Create a file from text content; convertTo makes it a native Google Doc or Sheet (CSV content).", inputSchema: { account: accountField, name: z.string().trim().min(1).max(255), content: z.string().max(5_000_000), mimeType: z.string().optional().describe("Default text/plain; text/csv, text/markdown, application/json..."), parentId: z.string().optional(), convertTo: z.enum(["document", "spreadsheet"]).optional() }, annotations: WRITE },
    async ({ account, ...input }) => withAccount(account, async (t) => ({ file: await drive.uploadTextFile(t, input) })));

  server.registerTool("rename_file", { title: "Rename file", description: "Rename a file or folder.", inputSchema: { account: accountField, fileId: z.string().trim().min(1), name: z.string().trim().min(1).max(255) }, annotations: IDEMPOTENT_WRITE },
    async ({ account, fileId, name }) => withAccount(account, async (t) => ({ file: await drive.renameFile(t, fileId, name) })));

  server.registerTool("move_file", { title: "Move file", description: "Move a file or folder into another folder.", inputSchema: { account: accountField, fileId: z.string().trim().min(1), newParentId: z.string().trim().min(1) }, annotations: IDEMPOTENT_WRITE },
    async ({ account, fileId, newParentId }) => withAccount(account, async (t) => ({ file: await drive.moveFile(t, fileId, newParentId) })));

  server.registerTool("share_file", { title: "Share file", description: "Grant a person (or anyone with the link) reader, commenter, or writer access.", inputSchema: { account: accountField, fileId: z.string().trim().min(1), type: z.enum(["user", "anyone"]), email: z.string().email().optional().describe("Required when type is user."), role: z.enum(["reader", "commenter", "writer"]), notify: z.boolean().optional() }, annotations: WRITE },
    async ({ account, ...input }) => withAccount(account, async (t) => ({ permission: await drive.shareFile(t, input) })));

  server.registerTool("trash_file", { title: "Move file to trash", description: "Recoverable via untrash_file for 30 days.", inputSchema: { account: accountField, fileId: z.string().trim().min(1) }, annotations: IDEMPOTENT_WRITE },
    async ({ account, fileId }) => withAccount(account, async (t) => ({ file: await drive.setTrashed(t, fileId, true) })));

  server.registerTool("untrash_file", { title: "Restore file from trash", description: "Restore a trashed file or folder.", inputSchema: { account: accountField, fileId: z.string().trim().min(1) }, annotations: IDEMPOTENT_WRITE },
    async ({ account, fileId }) => withAccount(account, async (t) => ({ file: await drive.setTrashed(t, fileId, false) })));

  server.registerTool("delete_file_permanently", { title: "Permanently delete file", description: "Bypasses trash; NO recovery. Prefer trash_file unless explicitly asked, and confirm first.", inputSchema: { account: accountField, fileId: z.string().trim().min(1) }, annotations: DESTRUCTIVE },
    async ({ account, fileId }) => withAccount(account, async (t) => { await drive.deleteFilePermanently(t, fileId); return { deleted: true, fileId }; }));
}

// ---------------------------------------------------------------- Sheets
export function registerSheetsReadTools(server: McpServer) {
  server.registerTool("get_spreadsheet", { title: "Get spreadsheet", description: "Title, URL, and the sheets (tabs) with their sizes.", inputSchema: { account: accountField, spreadsheetId: z.string().trim().min(1) }, annotations: READ_ONLY },
    async ({ account, spreadsheetId }) => withAccount(account, async (t) => ({ spreadsheet: await sheets.getSpreadsheet(t, spreadsheetId) })));

  server.registerTool("read_range", { title: "Read cells", description: 'Read values from an A1 range, e.g. "Sheet1!A1:D20" or a whole tab "Sheet1".', inputSchema: { account: accountField, spreadsheetId: z.string().trim().min(1), range: z.string().trim().min(1) }, annotations: READ_ONLY },
    async ({ account, spreadsheetId, range }) => withAccount(account, (t) => sheets.readRange(t, spreadsheetId, range)));
}

export function registerSheetsWriteTools(server: McpServer) {
  server.registerTool("create_spreadsheet", { title: "Create spreadsheet", description: "Create a new spreadsheet, optionally with named tabs.", inputSchema: { account: accountField, title: z.string().trim().min(1).max(255), sheetTitles: z.array(z.string().min(1)).max(20).optional() }, annotations: WRITE },
    async ({ account, title, sheetTitles }) => withAccount(account, async (t) => ({ spreadsheet: await sheets.createSpreadsheet(t, title, sheetTitles) })));

  server.registerTool("write_range", { title: "Write cells", description: "Overwrite an A1 range with rows of values. Formulas are evaluated unless rawInput is set.", inputSchema: { account: accountField, spreadsheetId: z.string().trim().min(1), range: z.string().trim().min(1), values: rows, rawInput: z.boolean().optional() }, annotations: IDEMPOTENT_WRITE },
    async ({ account, spreadsheetId, range, values, rawInput }) => withAccount(account, async (t) => ({ result: await sheets.writeRange(t, spreadsheetId, range, values, rawInput) })));

  server.registerTool("append_rows", { title: "Append rows", description: "Append rows after the last row of data in the given range or tab.", inputSchema: { account: accountField, spreadsheetId: z.string().trim().min(1), range: z.string().trim().min(1).describe('Tab or range that locates the table, e.g. "Sheet1!A:D".'), values: rows, rawInput: z.boolean().optional() }, annotations: WRITE },
    async ({ account, spreadsheetId, range, values, rawInput }) => withAccount(account, async (t) => ({ result: await sheets.appendRows(t, spreadsheetId, range, values, rawInput) })));

  server.registerTool("clear_range", { title: "Clear cells", description: "Clear values in an A1 range (formatting stays).", inputSchema: { account: accountField, spreadsheetId: z.string().trim().min(1), range: z.string().trim().min(1) }, annotations: DESTRUCTIVE },
    async ({ account, spreadsheetId, range }) => withAccount(account, async (t) => ({ result: await sheets.clearRange(t, spreadsheetId, range) })));

  server.registerTool("add_sheet", { title: "Add sheet tab", description: "Add a new tab to a spreadsheet.", inputSchema: { account: accountField, spreadsheetId: z.string().trim().min(1), title: z.string().trim().min(1).max(100) }, annotations: WRITE },
    async ({ account, spreadsheetId, title }) => withAccount(account, async (t) => ({ result: await sheets.addSheet(t, spreadsheetId, title) })));
}

// ---------------------------------------------------------------- Docs
export function registerDocsReadTools(server: McpServer) {
  server.registerTool("get_document", { title: "Read a Google Doc", description: "Title and the document's text, including table cells.", inputSchema: { account: accountField, documentId: z.string().trim().min(1) }, annotations: READ_ONLY },
    async ({ account, documentId }) => withAccount(account, async (t) => ({ document: await docs.getDocument(t, documentId) })));
}

export function registerDocsWriteTools(server: McpServer) {
  server.registerTool("create_document", { title: "Create a Google Doc", description: "Create a document, optionally with initial text.", inputSchema: { account: accountField, title: z.string().trim().min(1).max(255), content: z.string().max(200000).optional() }, annotations: WRITE },
    async ({ account, title, content }) => withAccount(account, async (t) => ({ document: await docs.createDocument(t, title, content) })));

  server.registerTool("append_to_document", { title: "Append to a Google Doc", description: "Append text at the end of the document.", inputSchema: { account: accountField, documentId: z.string().trim().min(1), text: z.string().min(1).max(200000) }, annotations: WRITE },
    async ({ account, documentId, text }) => withAccount(account, (t) => docs.appendText(t, documentId, text)));

  server.registerTool("replace_in_document", { title: "Find and replace in a Google Doc", description: "Replace every occurrence of a string.", inputSchema: { account: accountField, documentId: z.string().trim().min(1), find: z.string().min(1).max(1000), replace: z.string().max(10000), matchCase: z.boolean().optional() }, annotations: IDEMPOTENT_WRITE },
    async ({ account, documentId, find, replace, matchCase }) => withAccount(account, (t) => docs.replaceText(t, documentId, find, replace, matchCase ?? true)));
}

// ---------------------------------------------------------------- Tasks
export function registerTasksReadTools(server: McpServer) {
  server.registerTool("list_task_lists", { title: "List task lists", description: "The account's Google Tasks lists.", inputSchema: { account: accountField }, annotations: READ_ONLY },
    async ({ account }) => withAccount(account, async (t) => ({ lists: await tasks.listTaskLists(t) })));

  server.registerTool("list_tasks", { title: "List tasks", description: "Tasks in a list (default list if none given); completed ones only when asked.", inputSchema: { account: accountField, taskListId: z.string().optional(), showCompleted: z.boolean().optional(), dueMin: isoTime.optional(), dueMax: isoTime.optional(), maxResults: z.number().int().min(1).max(100).optional(), pageToken: z.string().optional() }, annotations: READ_ONLY },
    async ({ account, ...input }) => withAccount(account, (t) => tasks.listTasks(t, input)));
}

export function registerTasksWriteTools(server: McpServer) {
  server.registerTool("create_task", { title: "Create task", description: "Add a task, optionally with notes and a due date.", inputSchema: { account: accountField, taskListId: z.string().optional(), title: z.string().trim().min(1).max(1000), notes: z.string().max(8000).optional(), due: isoTime.optional() }, annotations: WRITE },
    async ({ account, ...input }) => withAccount(account, async (t) => ({ task: await tasks.createTask(t, input) })));

  server.registerTool("update_task", { title: "Update task", description: "Edit a task or mark it completed / not completed.", inputSchema: { account: accountField, taskListId: z.string().optional(), taskId: z.string().trim().min(1), title: z.string().max(1000).optional(), notes: z.string().max(8000).optional(), due: isoTime.optional(), completed: z.boolean().optional() }, annotations: IDEMPOTENT_WRITE },
    async ({ account, ...input }) => withAccount(account, async (t) => ({ task: await tasks.updateTask(t, input) })));

  server.registerTool("delete_task", { title: "Delete task", description: "Delete a task permanently.", inputSchema: { account: accountField, taskListId: z.string().optional(), taskId: z.string().trim().min(1) }, annotations: DESTRUCTIVE },
    async ({ account, taskListId, taskId }) => withAccount(account, async (t) => { await tasks.deleteTask(t, taskListId, taskId); return { deleted: true, taskId }; }));
}

// ---------------------------------------------------------------- Slides
export function registerSlidesReadTools(server: McpServer) {
  server.registerTool("get_presentation", { title: "Read a Slides deck", description: "Title, slide count, and the text on each slide.", inputSchema: { account: accountField, presentationId: z.string().trim().min(1) }, annotations: READ_ONLY },
    async ({ account, presentationId }) => withAccount(account, async (t) => ({ presentation: await slides.getPresentation(t, presentationId) })));
}

export function registerSlidesWriteTools(server: McpServer) {
  server.registerTool("create_presentation", { title: "Create a Slides deck", description: "Create an empty presentation.", inputSchema: { account: accountField, title: z.string().trim().min(1).max(255) }, annotations: WRITE },
    async ({ account, title }) => withAccount(account, async (t) => ({ presentation: await slides.createPresentation(t, title) })));
}
