import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  exchangePublicToken,
  getAccounts,
  getInstitution,
  getItem,
} from "@/lib/connections/plaid";
import { upsertPlaidItem } from "@/lib/connections/plaid-store";
import { getValidationErrorMessage, jsonError, requireAdminRequest } from "@/lib/firebase/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  publicToken: z.string().trim().min(1).max(200),
  /** Link hands these back in its onSuccess metadata; both are advisory. */
  institutionId: z.string().trim().max(64).optional(),
  institutionName: z.string().trim().max(120).optional(),
});

/**
 * Turns Link's short-lived public token into the long-lived access token and
 * stores it encrypted. The token is exchanged server-side and never returned
 * to the browser.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const input = schema.parse(await request.json().catch(() => null));
    const { access_token: accessToken, item_id: itemId } = await exchangePublicToken(input.publicToken);

    const [accountsResponse, itemResponse] = await Promise.all([
      getAccounts(accessToken),
      getItem(accessToken).catch(() => null),
    ]);

    const institutionId = itemResponse?.item.institution_id ?? input.institutionId;

    // Plaid's own institution record gives a cleaner display name than Link's
    // metadata, but it is optional: a failure here must not lose the link.
    const institutionName =
      (institutionId
        ? await getInstitution(institutionId)
            .then((response) => response.institution.name)
            .catch(() => undefined)
        : undefined) ??
      input.institutionName ??
      "Bank";

    const item = await upsertPlaidItem({
      accessToken,
      itemId,
      institutionId: institutionId ?? undefined,
      institutionName,
      accounts: accountsResponse.accounts,
      consentExpiresAt: itemResponse?.item.consent_expiration_time ?? undefined,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(getValidationErrorMessage(error), 400);
    }

    return jsonError(error instanceof Error ? error.message : "Unable to link that bank.", 400);
  }
}
