const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveEdgeFunctionUrl,
  resolveAuthHeaders,
  normalizeSender,
  normalizeEmailPayload,
} = require("../emailService.js");

test("resolveEdgeFunctionUrl uses explicit edge function URL when provided", () => {
  const resolved = resolveEdgeFunctionUrl({
    edgeFunctionUrl: "https://example.supabase.co/functions/v1/custom",
    supabaseUrl: "https://ignored.supabase.co",
  });

  assert.equal(resolved, "https://example.supabase.co/functions/v1/custom");
});

test("resolveEdgeFunctionUrl builds URL from Supabase URL when custom URL is absent", () => {
  const resolved = resolveEdgeFunctionUrl({
    supabaseUrl: "https://project.supabase.co/",
  });

  assert.equal(
    resolved,
    "https://project.supabase.co/functions/v1/clever-handler"
  );
});

test("resolveAuthHeaders always includes content type and bearer auth when key exists", () => {
  const headers = resolveAuthHeaders({
    edgeFunctionApiKey: "test-anon-key",
  });

  assert.deepEqual(headers, {
    "Content-Type": "application/json",
    apikey: "test-anon-key",
    Authorization: "Bearer test-anon-key",
  });
});

test("resolveAuthHeaders omits auth headers when key is missing", () => {
  const headers = resolveAuthHeaders({});

  assert.deepEqual(headers, {
    "Content-Type": "application/json",
  });
});

test("resolveAuthHeaders falls back to Supabase key when edge key is missing", () => {
  const headers = resolveAuthHeaders({
    supabaseKey: "supabase-anon-key",
  });

  assert.deepEqual(headers, {
    "Content-Type": "application/json",
    apikey: "supabase-anon-key",
    Authorization: "Bearer supabase-anon-key",
  });
});

test("resolveEdgeFunctionUrl handles environment-specific Supabase projects", () => {
  const environments = [
    {
      name: "development",
      supabaseUrl: "https://dev-project.supabase.co",
    },
    {
      name: "staging",
      supabaseUrl: "https://staging-project.supabase.co",
    },
    {
      name: "production",
      supabaseUrl: "https://prod-project.supabase.co",
    },
  ];

  environments.forEach((environment) => {
    const resolvedUrl = resolveEdgeFunctionUrl({
      supabaseUrl: environment.supabaseUrl,
    });
    assert.equal(
      resolvedUrl,
      `${environment.supabaseUrl}/functions/v1/clever-handler`,
      `Unexpected URL for ${environment.name}`
    );
  });
});

test("normalizeSender uses noreply address by default", () => {
  const from = normalizeSender({});
  assert.equal(from, "FittnaClass <noreply@fittnaclass.online>");
});

test("normalizeSender accepts allowed fittnaclass addresses only", () => {
  const senderOne = normalizeSender({
    from: "FittnaClass <hello@fittnaclass.online>",
  });
  const senderTwo = normalizeSender({
    from: "support@fittnaclass.online",
  });

  assert.equal(senderOne, "FittnaClass <hello@fittnaclass.online>");
  assert.equal(senderTwo, "FittnaClass <support@fittnaclass.online>");
});

test("normalizeSender rejects disallowed sender domain", () => {
  assert.throws(
    () => normalizeSender({ from: "FittnaClass <onboarding@resend.dev>" }),
    /Invalid sender address/
  );
});

test("normalizeEmailPayload trims email and normalizes supported role", () => {
  const payload = normalizeEmailPayload({
    email: "  student@example.com  ",
    role: "TEACHER",
  });

  assert.deepEqual(payload, {
    email: "student@example.com",
    role: "teacher",
  });
});

test("normalizeEmailPayload defaults unknown role to student", () => {
  const payload = normalizeEmailPayload({
    email: "student@example.com",
    role: "admin",
  });

  assert.deepEqual(payload, {
    email: "student@example.com",
    role: "student",
  });
});

test("normalizeEmailPayload throws when email is missing", () => {
  assert.throws(
    () => normalizeEmailPayload({ role: "teacher" }),
    /Email is required/
  );
});
