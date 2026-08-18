import "server-only";

/**
 * OAuth token/revocation requests are form-encoded per spec, but some clients
 * send JSON. Accept either and normalise to a flat string map.
 */
export async function readOAuthFormBody(request: Request) {
  const values = new Map<string, string>();
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const parsed = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([key, value]) => {
        if (typeof value === "string") {
          values.set(key, value);
        }
      });
    }

    return values;
  }

  const formData = await request.formData().catch(() => null);

  formData?.forEach((value, key) => {
    if (typeof value === "string") {
      values.set(key, value);
    }
  });

  return values;
}
