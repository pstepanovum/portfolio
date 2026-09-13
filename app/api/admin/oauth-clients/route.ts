import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { getValidationErrorMessage, jsonError, requireAdminRequest } from "@/lib/firebase/http";
import { listRegisteredClients } from "@/lib/oauth/clients";
import { findImpersonation, sanitizeClientName } from "@/lib/oauth/client-identity";
import { registerOAuthClient } from "@/lib/oauth/store";

export const runtime = "nodejs";

const createSchema = z.object({
  clientName: z.string().trim().min(2).max(60),
  redirectUris: z
    .array(z.string().trim().min(1).max(500))
    .min(1)
    .max(5)
    .describe("Exact callback URLs the app will use."),
});

/**
 * Client ids the dashboard has issued.
 *
 * A client id is a public identifier, not a secret: this server issues no
 * client secrets and requires PKCE on every authorization, so knowing an id
 * grants nothing on its own. What actually binds an app is its redirect URI,
 * which the authorize endpoint matches exactly.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({ clients: await listRegisteredClients() });
}

/** Issues a client id by hand, for apps that cannot register themselves. */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const input = createSchema.parse(await request.json().catch(() => null));

    const redirectUris = input.redirectUris.map((value) => {
      let parsed: URL;

      try {
        parsed = new URL(value);
      } catch {
        throw new Error(`"${value}" is not a valid URL. Include the scheme, for example myapp://callback.`);
      }

      if (parsed.hash) {
        throw new Error("A redirect URI cannot contain a fragment.");
      }

      // http is allowed only on loopback, which is how native and CLI clients
      // receive a callback; anything else on the open web must use https.
      const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);

      if (parsed.protocol === "http:" && !isLoopback) {
        throw new Error("Only https, a custom scheme, or http on localhost may be used.");
      }

      return parsed.toString();
    });

    const clientName = sanitizeClientName(input.clientName);

    for (const uri of redirectUris) {
      const impersonation = findImpersonation(clientName, uri);

      if (impersonation) {
        throw new Error(impersonation);
      }
    }

    const client = await registerOAuthClient({ clientName, redirectUris });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Unable to issue a client id.", 400);
  }
}
