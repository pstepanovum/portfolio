import "server-only";

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

/** MCP tool results carry text blocks; JSON is the most portable payload. */
export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

/**
 * Tool-level failures are reported as results with isError, not thrown, so the
 * model can read the reason and correct itself instead of seeing a transport error.
 */
export function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

export function notFoundResult(label: string, id: string) {
  return errorResult(`No ${label} exists with id "${id}".`);
}
