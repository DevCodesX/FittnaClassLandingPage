const test = require("node:test");
const assert = require("node:assert/strict");
const { triggerConfirmationEmail } = require("../emailService.js");

test("triggerConfirmationEmail sends POST with Bearer token and payload", async () => {
  const calls = [];
  const events = [];
  const logs = [];
  const logger = {
    info: (...args) => logs.push({ level: "info", args }),
    warn: (...args) => logs.push({ level: "warn", args }),
    error: (...args) => logs.push({ level: "error", args }),
  };
  const fetchMock = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    };
  };

  await triggerConfirmationEmail(fetchMock, {
    email: "user@example.com",
    role: "student",
    supabaseUrl: "https://aukkolqcucuzifmdeqkc.supabase.co",
    edgeFunctionApiKey: "anon-key",
    logger: logger,
    onEvent: (event) => events.push(event),
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://aukkolqcucuzifmdeqkc.supabase.co/functions/v1/clever-handler"
  );
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(calls[0].init.headers, {
    "Content-Type": "application/json",
    apikey: "anon-key",
    Authorization: "Bearer anon-key",
  });
  assert.equal(
    calls[0].init.body,
    JSON.stringify({
      email: "user@example.com",
      role: "student",
      from: "FittnaClass <noreply@fittnaclass.online>",
    })
  );
  assert.equal(events[0].code, "request_start");
  assert.equal(events[1].code, "request_success");
  assert.equal(logs.some((entry) => entry.level === "info"), true);
});

test("triggerConfirmationEmail rejects unsupported sender address", async () => {
  const fetchMock = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => "",
  });

  await assert.rejects(
    () =>
      triggerConfirmationEmail(fetchMock, {
        email: "user@example.com",
        role: "teacher",
        from: "FittnaClass <onboarding@resend.dev>",
        supabaseUrl: "https://aukkolqcucuzifmdeqkc.supabase.co",
        edgeFunctionApiKey: "anon-key",
      }),
    /Invalid sender address/
  );
});

test("triggerConfirmationEmail throws detailed error for unauthorized responses", async () => {
  const fetchMock = async () => ({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    text: async () => "Invalid JWT",
  });

  await assert.rejects(
    () =>
      triggerConfirmationEmail(fetchMock, {
        email: "user@example.com",
        role: "teacher",
        supabaseUrl: "https://aukkolqcucuzifmdeqkc.supabase.co",
        edgeFunctionApiKey: "bad-token",
      }),
    (error) => {
      assert.equal(error.status, 401);
      assert.match(error.message, /401 Unauthorized/);
      assert.match(error.message, /Invalid JWT/);
      return true;
    }
  );
});

test("triggerConfirmationEmail surfaces network-level failures with context", async () => {
  const fetchMock = async () => {
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(
    () =>
      triggerConfirmationEmail(fetchMock, {
        email: "user@example.com",
        role: "teacher",
        supabaseUrl: "https://aukkolqcucuzifmdeqkc.supabase.co",
        edgeFunctionApiKey: "anon-key",
      }),
    /network error/i
  );
});

test("triggerConfirmationEmail rejects invalid payload before making request", async () => {
  let called = false;
  const events = [];
  const fetchMock = async () => {
    called = true;
    return { ok: true, status: 200, statusText: "OK", text: async () => "" };
  };

  await assert.rejects(
    () =>
      triggerConfirmationEmail(fetchMock, {
        email: "   ",
        role: "teacher",
        supabaseUrl: "https://aukkolqcucuzifmdeqkc.supabase.co",
        edgeFunctionApiKey: "anon-key",
        onEvent: (event) => events.push(event),
      }),
    /Email is required/
  );

  assert.equal(called, false);
  assert.equal(events.length > 0, true);
  assert.equal(events[0].code, "validation_error");
});
