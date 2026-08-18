import { NextResponse } from "next/server";
import { corsPreflightResponse, withCors } from "@/lib/oauth/cors";
import { revokeToken } from "@/lib/oauth/store";
import { readOAuthFormBody } from "@/lib/oauth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 7009. Always answers 200, even for an unknown token, so the endpoint
 * cannot be used to probe which tokens exist.
 */
export async function POST(request: Request) {
  const body = await readOAuthFormBody(request);
  const token = body.get("token");

  if (token) {
    await revokeToken(token);
  }

  return withCors(NextResponse.json({}, { status: 200 }));
}

export async function OPTIONS() {
  return corsPreflightResponse();
}
