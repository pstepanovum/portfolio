import { NextResponse } from "next/server";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";

export const runtime = "nodejs";

/** The apps server moved from /api/mcp/admin; tell clients where, plainly. */
function moved() {
  return withCors(
    NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "This server moved to /api/mcp/apps. Remove this connector and add https://pstepanov.dev/api/mcp/apps.",
        },
        id: null,
      },
      { status: 410 },
    ),
  );
}

export async function POST() {
  return moved();
}

export async function GET() {
  return moved();
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
