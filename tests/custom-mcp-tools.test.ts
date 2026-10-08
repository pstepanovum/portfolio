import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_STORED_TOOLS_BYTES,
  ToolsTooLargeError,
  collectToolPages,
  decodeTools,
  encodeTools,
  statusAfterFailedDiscovery,
} from "../lib/connections/custom-mcp-tools";

type Tool = { name: string; description: string; inputSchema: Record<string, unknown> };

/** A CRM-shaped tool: long description, fifteen documented properties. */
function crmTool(i: number): Tool {
  const properties: Record<string, unknown> = {};

  for (let p = 0; p < 15; p += 1) {
    properties[`field_${p}`] = {
      type: p % 3 === 0 ? "number" : "string",
      description: `Field ${p} of record ${i}. Optional unless the record is new, in which case it is required by the server and validated against the account's settings before it is saved.`,
    };
  }

  return {
    name: `tool_${i}`,
    description: `Tool ${i} reads or changes one kind of CRM record. It accepts the fields below, validates them, and returns the stored record with its id, timestamps, and any computed totals. `.repeat(3),
    inputSchema: { type: "object", properties, required: ["field_0"], additionalProperties: false },
  };
}

describe("custom MCP tool storage", () => {
  it("round-trips through gzip", () => {
    const tools = [crmTool(1), crmTool(2)];

    assert.deepEqual(decodeTools<Tool>({ toolsGz: encodeTools(tools) }), tools);
  });

  it("fits a server whose JSON is past Firestore's 1 MiB field cap", () => {
    const tools = Array.from({ length: 304 }, (_, i) => crmTool(i));
    const json = JSON.stringify(tools);

    assert.ok(json.length > 1_048_487, `fixture should overflow the old field (${json.length})`);

    const packed = encodeTools(tools);
    assert.ok(packed.byteLength < MAX_STORED_TOOLS_BYTES);
    assert.equal(decodeTools<Tool>({ toolsGz: packed }).length, 304);
  });

  it("refuses with a clear error when even compressed it cannot fit", () => {
    // Random text does not compress.
    const noise = Array.from({ length: 2000 }, (_, i) => ({
      name: `t${i}`,
      description: Array.from({ length: 600 }, () => Math.random().toString(36).slice(2)).join(""),
      inputSchema: {},
    }));

    assert.throws(() => encodeTools(noise), ToolsTooLargeError);
  });

  it("still reads records stored as the old JSON string", () => {
    assert.deepEqual(decodeTools<Tool>({ toolsJson: JSON.stringify([crmTool(7)]) }), [crmTool(7)]);
  });

  it("prefers the gzip field when both are present", () => {
    const fresh = [crmTool(1)];

    assert.deepEqual(
      decodeTools<Tool>({ toolsGz: encodeTools(fresh), toolsJson: JSON.stringify([crmTool(2)]) }),
      fresh,
    );
  });

  it("treats missing or corrupt data as no tools", () => {
    assert.deepEqual(decodeTools({}), []);
    assert.deepEqual(decodeTools({ toolsJson: "{not json" }), []);
    assert.deepEqual(decodeTools({ toolsGz: new Uint8Array([1, 2, 3]) }), []);
    assert.deepEqual(decodeTools({ toolsJson: JSON.stringify({ not: "an array" }) }), []);
  });
});

describe("custom MCP tool pagination", () => {
  it("follows nextCursor until the last page", async () => {
    const pages: Record<string, { tools: number[]; nextCursor?: string }> = {
      start: { tools: [1, 2], nextCursor: "b" },
      b: { tools: [3], nextCursor: "c" },
      c: { tools: [4, 5] },
    };
    const asked: (string | undefined)[] = [];

    const tools = await collectToolPages(async (cursor) => {
      asked.push(cursor);
      return pages[cursor ?? "start"];
    });

    assert.deepEqual(tools, [1, 2, 3, 4, 5]);
    assert.deepEqual(asked, [undefined, "b", "c"]);
  });

  it("stops on a repeated cursor or at the page cap", async () => {
    const looping = await collectToolPages(async () => ({ tools: [1], nextCursor: "same" }));
    assert.deepEqual(looping, [1, 1]);

    let n = 0;
    const endless = await collectToolPages(async () => ({ tools: [n], nextCursor: String(++n) }), 3);
    assert.equal(endless.length, 3);
  });
});

describe("status after a failed discovery", () => {
  it("keeps a server with earlier tools active through a timeout", () => {
    assert.equal(statusAfterFailedDiscovery({ previous: "active", reauth: false, storedTools: 304 }), "active");
    assert.equal(statusAfterFailedDiscovery({ previous: "error", reauth: false, storedTools: 304 }), "active");
  });

  it("asks for a reconnect when credentials are dead", () => {
    assert.equal(statusAfterFailedDiscovery({ previous: "active", reauth: true, storedTools: 304 }), "reauth");
    assert.equal(statusAfterFailedDiscovery({ previous: "reauth", reauth: false, storedTools: 304 }), "reauth");
  });

  it("reports an error when there is nothing to fall back on", () => {
    assert.equal(statusAfterFailedDiscovery({ previous: "active", reauth: false, storedTools: 0 }), "error");
    assert.equal(statusAfterFailedDiscovery({ previous: "pending", reauth: false, storedTools: 0 }), "error");
  });
});
