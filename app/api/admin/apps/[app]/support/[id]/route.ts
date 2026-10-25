import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { appAdminErrorResponse, requireAppAdmin } from "@/lib/apps/http";
import { SUPPORT_STATUSES, replyToSupportRequest, setSupportStatus, type SupportStatus } from "@/lib/apps/support-client";
import { getValidationErrorMessage, jsonError } from "@/lib/firebase/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ app: string; id: string }> };

/** A request id: the app's Firestore auto id. */
const ID_PATTERN = /^[A-Za-z0-9]{10,40}$/;

const patchSchema = z.object({ status: z.enum(SUPPORT_STATUSES as [SupportStatus, ...SupportStatus[]]) });
const replySchema = z.object({ message: z.string().trim().min(2, "Write a reply first.").max(8000) });

async function guarded(request: NextRequest, context: Context) {
  const { app, id } = await context.params;
  const guard = await requireAppAdmin(request, app);
  if (guard instanceof NextResponse) return guard;
  if (!guard.app.support) return jsonError("This app has no support inbox.", 404);
  if (!ID_PATTERN.test(id)) return jsonError("Unknown request.", 404);
  return { ...guard, id };
}

async function parse<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T | NextResponse> {
  try {
    return schema.parse(await request.json().catch(() => null));
  } catch (error) {
    if (error instanceof ZodError) return jsonError(getValidationErrorMessage(error), 400);
    throw error;
  }
}

/** Marks a request open, answered, or closed. */
export async function PATCH(request: NextRequest, context: Context) {
  const guard = await guarded(request, context);
  if (guard instanceof NextResponse) return guard;
  const input = await parse(request, patchSchema);
  if (input instanceof NextResponse) return input;

  try {
    return NextResponse.json({ request: await setSupportStatus(guard.app, guard.id, input.status) });
  } catch (error) {
    return appAdminErrorResponse(error, "Unable to update the request.");
  }
}

/** Emails a reply through the app's own support address and marks the request answered. */
export async function POST(request: NextRequest, context: Context) {
  const guard = await guarded(request, context);
  if (guard instanceof NextResponse) return guard;
  const input = await parse(request, replySchema);
  if (input instanceof NextResponse) return input;

  try {
    const by = guard.session.email ?? guard.session.uid;
    return NextResponse.json({ request: await replyToSupportRequest(guard.app, guard.id, input.message, by) });
  } catch (error) {
    return appAdminErrorResponse(error, "Unable to send the reply.");
  }
}
