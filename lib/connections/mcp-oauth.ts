import "server-only";

import { randomBytes } from "node:crypto";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin-core";
import { decryptSecret, encryptSecret } from "@/lib/connections/crypto";

export const CUSTOM_MCP_OAUTH_CALLBACK_PATH = "/api/admin/custom-mcp/oauth/callback";
const COLLECTION = "customMcpServers";

/**
 * The SDK's OAuth client provider, backed by the custom server's Firestore
 * document. Everything the SDK asks us to remember (registration, tokens,
 * PKCE verifier, discovery) lands on that one document, encrypted where it is
 * a credential, so the flow survives the stateless request boundary between
 * "redirect the admin to the remote's consent screen" and "the remote sends
 * them back with a code".
 */
export class FirestoreOAuthProvider implements OAuthClientProvider {
  /** Set when the SDK asks for a browser redirect; the route hands it to the client. */
  authorizationUrl: URL | undefined;

  private cache: Record<string, unknown> | undefined;

  constructor(
    private readonly serverId: string,
    private readonly redirectUri: string,
  ) {}

  private get ref() {
    return adminDb.collection(COLLECTION).doc(this.serverId);
  }

  private async data() {
    if (!this.cache) {
      this.cache = ((await this.ref.get()).data() as Record<string, unknown>) ?? {};
    }

    return this.cache;
  }

  private async write(fields: Record<string, unknown>) {
    await this.ref.update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
    this.cache = { ...(await this.data()), ...fields };
  }

  private async readJson<T>(field: string, encrypted: boolean): Promise<T | undefined> {
    const raw = (await this.data())[field];

    if (typeof raw !== "string" || !raw) {
      return undefined;
    }

    try {
      return JSON.parse(encrypted ? decryptSecret(raw) : raw) as T;
    } catch {
      return undefined;
    }
  }

  get redirectUrl() {
    return this.redirectUri;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "Pavel Stepanov Admin MCP",
      client_uri: "https://pstepanov.dev",
      redirect_uris: [this.redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  /** Random per-flow state, stored so the callback can find this server by it. */
  async state() {
    const state = randomBytes(24).toString("base64url");
    await this.write({ oauthState: state, oauthStateCreatedAt: Date.now() });
    return state;
  }

  clientInformation() {
    return this.readJson<OAuthClientInformationMixed>("oauthClient", true);
  }

  async saveClientInformation(info: OAuthClientInformationMixed) {
    await this.write({ oauthClient: encryptSecret(JSON.stringify(info)) });
  }

  tokens() {
    return this.readJson<OAuthTokens>("oauthTokens", true);
  }

  async saveTokens(tokens: OAuthTokens) {
    await this.write({
      oauthTokens: encryptSecret(JSON.stringify(tokens)),
      oauthTokensSavedAt: Date.now(),
    });
  }

  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url;
  }

  async saveCodeVerifier(verifier: string) {
    await this.write({ oauthVerifier: encryptSecret(verifier) });
  }

  async codeVerifier() {
    const raw = (await this.data()).oauthVerifier;

    if (typeof raw !== "string" || !raw) {
      throw new Error("No PKCE verifier is stored for this authorization; start the connection again.");
    }

    return decryptSecret(raw);
  }

  async saveDiscoveryState(state: OAuthDiscoveryState) {
    await this.write({ oauthDiscovery: JSON.stringify(state) });
  }

  discoveryState() {
    return this.readJson<OAuthDiscoveryState>("oauthDiscovery", false);
  }

  async invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery") {
    const clear = {
      client: { oauthClient: FieldValue.delete() },
      tokens: { oauthTokens: FieldValue.delete(), oauthTokensSavedAt: FieldValue.delete() },
      verifier: { oauthVerifier: FieldValue.delete() },
      discovery: { oauthDiscovery: FieldValue.delete() },
    };

    const fields =
      scope === "all" ? { ...clear.client, ...clear.tokens, ...clear.verifier, ...clear.discovery } : clear[scope];

    await this.ref.update(fields);
    this.cache = undefined;
  }
}
