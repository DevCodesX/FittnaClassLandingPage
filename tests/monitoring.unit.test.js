const test = require("node:test");
const assert = require("node:assert/strict");
const {
  checkDnsResolution,
  checkHttpAvailability,
  buildHealthReport,
} = require("../monitoring.js");

test("checkDnsResolution returns ok for resolved host", async () => {
  const result = await checkDnsResolution("example.com", async () => ["93.184.216.34"]);
  assert.equal(result.ok, true);
  assert.equal(result.records.length, 1);
});

test("checkDnsResolution rejects non-address DNS records", async () => {
  const result = await checkDnsResolution("example.com", async () => [
    { type: "NS", value: "dns1.example.com" },
  ]);
  assert.equal(result.ok, false);
});

test("checkDnsResolution returns error for unresolved host", async () => {
  const result = await checkDnsResolution("missing.example", async () => {
    throw new Error("ENOTFOUND");
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /ENOTFOUND/);
});

test("checkHttpAvailability returns status for success", async () => {
  const result = await checkHttpAvailability("https://example.com", async () => ({
    ok: true,
    status: 200,
  }));
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
});

test("checkHttpAvailability treats 401 as reachable endpoint", async () => {
  const result = await checkHttpAvailability("https://example.com/protected", async () => ({
    ok: false,
    status: 401,
  }));
  assert.equal(result.ok, true);
  assert.equal(result.status, 401);
});

test("buildHealthReport marks unhealthy when app DNS fails", async () => {
  const report = await buildHealthReport(
    {
      appUrl: "https://fittnaclass.online",
      edgeFunctionUrl: "https://aukkolqcucuzifmdeqkc.supabase.co/functions/v1/clever-handler",
    },
    {
      resolveDns: async (hostname) => {
        if (hostname === "fittnaclass.online") {
          throw new Error("ENOTFOUND");
        }
        return ["1.1.1.1"];
      },
      fetchHttp: async () => ({ ok: true, status: 200 }),
    }
  );

  assert.equal(report.ok, false);
  assert.equal(report.checks.appDns.ok, false);
  assert.equal(report.checks.appHttp.ok, false);
  assert.equal(report.checks.edgeDns.ok, true);
  assert.equal(report.checks.edgeHttp.ok, true);
});
