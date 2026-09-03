import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { createCustomMcpServer, listCustomMcpServers } from "@/lib/connections/custom-mcp";
import { CUSTOM_MCP_OAUTH_CALLBACK_PATH } from "@/lib/connections/mcp-oauth";
import { getBaseUrl } from "@/lib/oauth/config";
import { getValidationErrorMessage, jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";
export const maxDuration = 30;

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  url: z.string().trim().min(8).max(500),
  authType: z.enum(["none", "bearer", "oauth"]),
  bearerToken: z.string().trim().max(4000).optional(),
});

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({ servers: await listCustomMcpServers() });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const input = createSchema.parse(await request.json().catch(() => null));
    const result = await createCustomMcpServer({
      ...input,
      redirectUri: `${getBaseUrl(request)}${CUSTOM_MCP_OAUTH_CALLBACK_PATH}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Unable to add the MCP server.", 400);
  }
}
