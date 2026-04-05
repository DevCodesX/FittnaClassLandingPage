function hasAddressRecords(records) {
  if (Array.isArray(records)) {
    return records.some((record) => {
      if (typeof record === "string") {
        return record.includes(".") || record.includes(":");
      }
      if (record && typeof record === "object") {
        if (typeof record.address === "string") {
          return true;
        }
        return record.type === "A" || record.type === "AAAA";
      }
      return false;
    });
  }

  if (records && typeof records === "object" && typeof records.address === "string") {
    return true;
  }

  return false;
}

async function checkDnsResolution(hostname, resolveFunction) {
  try {
    const records = await resolveFunction(hostname);
    const normalizedRecords = Array.isArray(records) ? records : records ? [records] : [];
    return {
      ok: hasAddressRecords(normalizedRecords),
      hostname,
      records: normalizedRecords,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      hostname,
      records: [],
      error: String(error?.message || error),
    };
  }
}

async function checkHttpAvailability(url, fetchFunction) {
  try {
    const response = await fetchFunction(url, { method: "GET" });
    const status = response?.status ?? 0;
    const reachable = status >= 200 && status < 500;
    return {
      ok: reachable,
      status: status,
      url,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      error: String(error?.message || error),
    };
  }
}

async function buildHealthReport(targets, dependencies) {
  const appUrl = new URL(targets.appUrl);
  const edgeUrl = new URL(targets.edgeFunctionUrl);

  const appDns = await checkDnsResolution(appUrl.hostname, dependencies.resolveDns);
  const edgeDns = await checkDnsResolution(edgeUrl.hostname, dependencies.resolveDns);

  const appHttp = appDns.ok
    ? await checkHttpAvailability(targets.appUrl, dependencies.fetchHttp)
    : { ok: false, status: 0, url: targets.appUrl, error: "Skipped due to DNS failure." };

  const edgeHttp = edgeDns.ok
    ? await checkHttpAvailability(targets.edgeFunctionUrl, dependencies.fetchHttp)
    : { ok: false, status: 0, url: targets.edgeFunctionUrl, error: "Skipped due to DNS failure." };

  const overallOk = appDns.ok && edgeDns.ok && appHttp.ok && edgeHttp.ok;

  return {
    ok: overallOk,
    timestamp: new Date().toISOString(),
    checks: {
      appDns,
      appHttp,
      edgeDns,
      edgeHttp,
    },
  };
}

module.exports = {
  checkDnsResolution,
  checkHttpAvailability,
  buildHealthReport,
};
