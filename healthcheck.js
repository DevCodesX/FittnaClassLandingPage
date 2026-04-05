const dns = require("node:dns/promises");
const { buildHealthReport } = require("./monitoring.js");

async function run() {
  const appUrl = process.env.APP_URL || "https://fittnaclass.online";
  const edgeFunctionUrl =
    process.env.EDGE_FUNCTION_URL ||
    "https://aukkolqcucuzifmdeqkc.supabase.co/functions/v1/clever-handler";

  const report = await buildHealthReport(
    {
      appUrl,
      edgeFunctionUrl,
    },
    {
      resolveDns: (hostname) => dns.lookup(hostname, { all: true }),
      fetchHttp: fetch,
    }
  );

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  process.stderr.write(`healthcheck failed: ${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
