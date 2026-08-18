import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/firebase/auth";
import {
  buildAuthorizeUrl,
  buildRedirectWithCode,
  buildRedirectWithError,
  validateAuthorizeParams,
} from "@/lib/oauth/authorize";
import { readOAuthFormBody } from "@/lib/oauth/request";
import { createAuthorizationCode } from "@/lib/oauth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consent submission handler. Every parameter is re-validated here rather than
 * trusted from the posted form, since the form is attacker-reachable.
 */
export async function POST(request: Request) {
  const body = await readOAuthFormBody(request);
  const raw = Object.fromEntries(body.entries());

  const validation = await validateAuthorizeParams(raw);

  if (!validation.ok) {
    if (validation.redirectable && raw.redirect_uri) {
      return NextResponse.redirect(
        buildRedirectWithError(
          raw.redirect_uri,
          validation.error,
          validation.description,
          raw.state,
        ),
        { status: 303 },
      );
    }

    return NextResponse.json(
      { error: validation.error, error_description: validation.description },
      { status: 400 },
    );
  }

  const session = await getAdminSession();

  if (!session) {
    // Session expired between rendering consent and submitting it: bounce back
    // through the authorize page, which will route to login.
    return NextResponse.redirect(new URL(buildAuthorizeUrl(raw), request.url), {
      status: 303,
    });
  }

  const { params } = validation;

  if (body.get("decision") !== "allow") {
    return NextResponse.redirect(
      buildRedirectWithError(
        params.redirectUri,
        "access_denied",
        "The portfolio owner denied this request.",
        params.state,
      ),
      { status: 303 },
    );
  }

  const code = await createAuthorizationCode({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    scopes: params.scopes,
    codeChallenge: params.codeChallenge,
    resource: params.resource,
    adminUid: session.uid,
  });

  return NextResponse.redirect(
    buildRedirectWithCode(params.redirectUri, code, params.state),
    { status: 303 },
  );
}
