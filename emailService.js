(function (globalObject) {
  const DEFAULT_FUNCTION_PATH = "/functions/v1/clever-handler";
  const DEFAULT_SENDER_EMAIL = "noreply@fittnaclass.online";
  const ALLOWED_SENDER_ADDRESSES = new Set([
    "noreply@fittnaclass.online",
    "hello@fittnaclass.online",
    "support@fittnaclass.online",
  ]);

  function resolveEdgeFunctionUrl(options) {
    const configuredUrl = String(options?.edgeFunctionUrl || "").trim();
    if (configuredUrl) {
      return configuredUrl;
    }

    const supabaseUrl = String(options?.supabaseUrl || "").trim();
    if (!supabaseUrl) {
      return "";
    }

    return `${supabaseUrl.replace(/\/+$/, "")}${DEFAULT_FUNCTION_PATH}`;
  }

  function resolveAuthHeaders(options) {
    const apiKey = String(options?.edgeFunctionApiKey || options?.supabaseKey || "").trim();
    const headers = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers.apikey = apiKey;
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return headers;
  }

  function extractAddress(fromValue) {
    const normalized = String(fromValue || "").trim();
    const angleBracketMatch = normalized.match(/<([^>]+)>/);

    if (angleBracketMatch && angleBracketMatch[1]) {
      return angleBracketMatch[1].trim().toLowerCase();
    }

    return normalized.toLowerCase();
  }

  function normalizeSender(options) {
    const requestedSender = String(options?.from || "").trim();
    const senderAddress = requestedSender
      ? extractAddress(requestedSender)
      : DEFAULT_SENDER_EMAIL;

    if (!ALLOWED_SENDER_ADDRESSES.has(senderAddress)) {
      throw new Error(
        "Invalid sender address. Allowed senders: noreply@fittnaclass.online, hello@fittnaclass.online, support@fittnaclass.online"
      );
    }

    return `FittnaClass <${senderAddress}>`;
  }

  function createSafeLogger(options) {
    const fallbackLogger = typeof console !== "undefined" ? console : { info() {}, warn() {}, error() {} };
    const providedLogger = options?.logger;

    return {
      info: typeof providedLogger?.info === "function" ? providedLogger.info.bind(providedLogger) : fallbackLogger.info.bind(fallbackLogger),
      warn: typeof providedLogger?.warn === "function" ? providedLogger.warn.bind(providedLogger) : fallbackLogger.warn.bind(fallbackLogger),
      error: typeof providedLogger?.error === "function" ? providedLogger.error.bind(providedLogger) : fallbackLogger.error.bind(fallbackLogger),
    };
  }

  function emitEvent(options, event) {
    if (typeof options?.onEvent !== "function") {
      return;
    }

    try {
      options.onEvent({
        timestamp: new Date().toISOString(),
        ...event,
      });
    } catch (onEventError) {}
  }

  function normalizeEmailPayload(options) {
    const email = String(options?.email || "").trim();
    const roleCandidate = String(options?.role || "").trim().toLowerCase();
    const role = roleCandidate === "teacher" ? "teacher" : "student";

    if (!email) {
      throw new Error("Email is required.");
    }

    return { email, role };
  }

  async function parseErrorBody(response) {
    try {
      return (await response.text()) || "";
    } catch (readError) {
      return "";
    }
  }

  async function buildHttpFailure(response) {
    const responseBody = await parseErrorBody(response);
    const statusCode = response?.status ?? "unknown";
    const statusText = response?.statusText || "Unknown Error";
    const failure = new Error(
      `Email trigger failed (${statusCode} ${statusText})${responseBody ? `: ${responseBody}` : ""}`
    );
    failure.status = response?.status;
    failure.body = responseBody;
    return failure;
  }

  async function triggerConfirmationEmail(fetchImplementation, options) {
    if (typeof fetchImplementation !== "function") {
      throw new Error("A valid fetch implementation is required.");
    }

    const logger = createSafeLogger(options);
    const edgeFunctionUrl = resolveEdgeFunctionUrl(options);
    let payload;
    let sender;
    try {
      payload = normalizeEmailPayload(options);
      sender = normalizeSender(options);
    } catch (validationError) {
      emitEvent(options, {
        level: "error",
        code: "validation_error",
        message: validationError.message,
      });
      logger.warn("Email trigger validation failed", {
        message: validationError.message,
      });
      throw validationError;
    }

    if (!edgeFunctionUrl) {
      const missingUrlError = new Error("Edge function URL is missing.");
      emitEvent(options, {
        level: "error",
        code: "missing_edge_function_url",
        message: missingUrlError.message,
      });
      logger.error("Email trigger failed due to missing edge function URL");
      throw missingUrlError;
    }

    emitEvent(options, {
      level: "info",
      code: "request_start",
      edgeFunctionUrl: edgeFunctionUrl,
      email: payload.email,
      role: payload.role,
    });

    let response;
    try {
      response = await fetchImplementation(edgeFunctionUrl, {
        method: "POST",
        headers: resolveAuthHeaders(options),
        body: JSON.stringify({
          ...payload,
          from: sender,
        }),
      });
    } catch (networkError) {
      const wrappedNetworkError = new Error(`Email trigger failed (network error): ${networkError?.message || networkError}`);
      emitEvent(options, {
        level: "error",
        code: "network_error",
        message: wrappedNetworkError.message,
      });
      logger.error("Email trigger network error", {
        message: wrappedNetworkError.message,
      });
      throw wrappedNetworkError;
    }

    if (response?.ok) {
      emitEvent(options, {
        level: "info",
        code: "request_success",
        status: response?.status,
      });
      logger.info("Email trigger succeeded", {
        status: response?.status,
      });
      return;
    }

    const httpFailure = await buildHttpFailure(response);
    emitEvent(options, {
      level: "error",
      code: "http_error",
      status: httpFailure.status,
      message: httpFailure.message,
    });
    logger.error("Email trigger HTTP failure", {
      status: httpFailure.status,
      message: httpFailure.message,
    });
    throw httpFailure;
  }

  const EmailService = {
    resolveEdgeFunctionUrl,
    resolveAuthHeaders,
    normalizeSender,
    normalizeEmailPayload,
    triggerConfirmationEmail,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = EmailService;
  }

  globalObject.EmailService = EmailService;
})(typeof globalThis !== "undefined" ? globalThis : window);
