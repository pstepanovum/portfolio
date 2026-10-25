import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MANAGED_APPS, describeDuration, getManagedApp, redeemLink, tierOf } from "../lib/apps/registry";

describe("managed apps", () => {
  it("lists Cadence with its own codes, Plus, and a support inbox", () => {
    const cadence = getManagedApp("cadence");
    assert.ok(cadence);
    assert.equal(tierOf(cadence), "Plus");
    assert.equal(cadence.sharesCodesWith, undefined);
    assert.equal(cadence.secretEnv, "CADENCE_ADMIN_SECRET");
    assert.equal(cadence.support, true);
    assert.equal(redeemLink(cadence, "CADENCE-AB CD"), "https://cadence.pstepanov.dev/redeem?code=CADENCE-AB%20CD");
  });

  it("gives every app its own secret and keeps support to apps that have it", () => {
    const secrets = MANAGED_APPS.map((app) => app.secretEnv);
    assert.equal(new Set(secrets).size, secrets.length);
    assert.deepEqual(MANAGED_APPS.filter((app) => app.support).map((app) => app.id), ["cadence"]);
  });

  it("describes durations the way the apps do", () => {
    assert.equal(describeDuration(90), "3 months");
    assert.equal(describeDuration(365), "1 year");
    assert.equal(describeDuration(0), "Retired");
  });
});
