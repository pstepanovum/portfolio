import { NextResponse, type NextRequest } from "next/server";
import { requireAdminRequest } from "@/lib/firebase/http";
import { listConnections } from "@/lib/connections/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);

  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({ connections: await listConnections() });
}
