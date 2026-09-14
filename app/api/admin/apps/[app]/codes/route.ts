import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { createFriendCode, listFriendCodes } from "@/lib/apps/codes-client";
import { appAdminErrorResponse, requireAppAdmin } from "@/lib/apps/http";
import { getValidationErrorMessage, jsonError } from "@/lib/firebase/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ app: string }> };

const createSchema = z.object({
  label: z.string().trim().min(1, "Give the code a label.").max(80),
  code: z
    .string()
    .trim()
    .max(40)
    .regex(/^$|^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, "A custom code is letters and digits in groups joined by hyphens.")
    .optional(),
  durationDays: z.number().int().min(1).max(3650).nullable(),
  maxRedemptions: z.number().int().min(1).max(10_000),
  expiresAt: z.number().int().nullable(),
});

/** Every friend code for the app, with its redemptions. */
export async function GET(request: NextRequest, context: Context) {
  const guard = await requireAppAdmin(request, (await context.params).app);
  if (guard instanceof NextResponse) return guard;

  try {
    return NextResponse.json({ codes: await listFriendCodes(guard.app) });
  } catch (error) {
    return appAdminErrorResponse(error, "Unable to load friend codes.");
  }
}

/** Creates a friend code on the app. */
export async function POST(request: NextRequest, context: Context) {
  const guard = await requireAppAdmin(request, (await context.params).app);
  if (guard instanceof NextResponse) return guard;

  let input: z.infer<typeof createSchema>;
  try {
    input = createSchema.parse(await request.json().catch(() => null));
  } catch (error) {
    if (error instanceof ZodError) return jsonError(getValidationErrorMessage(error), 400);
    throw error;
  }

  try {
    const code = await createFriendCode(guard.app, {
      ...input,
      code: input.code || undefined,
      createdBy: guard.session.email ?? guard.session.uid,
    });
    return NextResponse.json({ code }, { status: 201 });
  } catch (error) {
    return appAdminErrorResponse(error, "Unable to create the code.");
  }
}
