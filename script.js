const SUPABASE_URL = "https://aukkolqcucuzifmdeqkc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1a2tvbHFjdWN1emlmbWRlcWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjMwNDQsImV4cCI6MjA5MDg5OTA0NH0.JY7JzzCFmIhIPa8TTtQLv53QA6IAOAr3McyM282OdOk";
const EDGE_FUNCTION_URL =
  (typeof window !== "undefined" && window.__FITTNA_EDGE_FUNCTION_URL__) ||
  `${SUPABASE_URL}/functions/v1/clever-handler`;
const EDGE_FUNCTION_API_KEY =
  (typeof window !== "undefined" && window.__FITTNA_EDGE_FUNCTION_ANON_KEY__) ||
  SUPABASE_KEY;
const EMAIL_FROM_ADDRESS =
  (typeof window !== "undefined" && window.__FITTNA_EMAIL_FROM__) ||
  "FittnaClass <noreply@fittnaclass.online>";
const MONITOR_ENDPOINT =
  (typeof window !== "undefined" && window.__FITTNA_MONITOR_ENDPOINT__) || "";
const supabaseClient =
  typeof supabase !== "undefined"
    ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

function trackOperationalEvent(event) {
  const eventPayload = {
    ...event,
    app: "fittna-landing-page",
    path: typeof window !== "undefined" ? window.location.pathname : "",
  };

  try {
    if (eventPayload.level === "error") {
      console.error("[monitor]", eventPayload);
    } else {
      console.log("[monitor]", eventPayload);
    }
  } catch (consoleError) {}

  if (!MONITOR_ENDPOINT || typeof window === "undefined") {
    return;
  }

  const serializedPayload = JSON.stringify(eventPayload);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(MONITOR_ENDPOINT, serializedPayload);
      return;
    }
  } catch (beaconError) {}

  try {
    fetch(MONITOR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: serializedPayload,
      keepalive: true,
    });
  } catch (monitorError) {}
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    trackOperationalEvent({
      level: "error",
      code: "window_error",
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackOperationalEvent({
      level: "error",
      code: "unhandled_promise_rejection",
      message: String(event.reason?.message || event.reason || "Unknown rejection"),
    });
  });
}

const navToggle = document.querySelector(".nav-toggle");
const mobileMenu = document.querySelector("#mobile-menu");

if (navToggle && mobileMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const navLinks = document.querySelectorAll(".nav-links .nav-link");
const navLinkHashes = new Set(
  Array.from(navLinks)
    .map((link) => link.getAttribute("href"))
    .filter((href) => Boolean(href))
);
const trackedSections = Array.from(navLinkHashes)
  .map((hash) => document.querySelector(hash))
  .filter((section) => section);

function setActiveNavLink(hash) {
  if (!hash || !navLinkHashes.has(hash)) {
    return;
  }

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === hash;
    link.classList.toggle("is-active", isActive);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveNavLink(link.getAttribute("href"));
  });
});

if (trackedSections.length > 0 && "IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      let activeEntry = null;

      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        if (
          !activeEntry ||
          entry.intersectionRatio > activeEntry.intersectionRatio
        ) {
          activeEntry = entry;
        }
      });

      if (activeEntry?.target?.id) {
        setActiveNavLink(`#${activeEntry.target.id}`);
      }
    },
    {
      rootMargin: "-35% 0px -55% 0px",
      threshold: [0.2, 0.35, 0.5, 0.7],
    }
  );

  trackedSections.forEach((section) => navObserver.observe(section));
}

window.addEventListener("hashchange", () => {
  setActiveNavLink(window.location.hash);
});

setActiveNavLink(window.location.hash || "#features");

const revealElements = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 40, 220)}ms`;
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const emailForms = document.querySelectorAll(".email-form");
const form = document.getElementById("email-form");
const emailInput = document.getElementById("email-input");
const message = document.getElementById("form-message");
const roleInput = document.getElementById("role-input");
const roleOptions = document.querySelectorAll(".role-option");

function setSelectedRole(roleValue) {
  if (!roleInput || roleOptions.length === 0) {
    return;
  }

  const normalizedRole = roleValue === "teacher" ? "teacher" : "student";
  roleInput.value = normalizedRole;

  roleOptions.forEach((option) => {
    const isActive = option.dataset.role === normalizedRole;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });
}

if (roleInput && roleOptions.length > 0) {
  roleOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const selectedRole = option.dataset.role;
      setSelectedRole(selectedRole);
    });
  });

  setSelectedRole(roleInput.value || "student");
}

function isDuplicateError(error) {
  const errorMessage = String(error?.message || "").toLowerCase();
  return errorMessage.includes("duplicate") || errorMessage.includes("unique");
}

function isRoleColumnIssue(error) {
  const errorMessage = String(error?.message || "").toLowerCase();
  return (
    errorMessage.includes("role") &&
    (errorMessage.includes("column") ||
      errorMessage.includes("schema") ||
      errorMessage.includes("not found"))
  );
}

async function triggerConfirmationEmail(email, role) {
  const requestPayload = {
    email: email,
    role: role,
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    edgeFunctionUrl: EDGE_FUNCTION_URL,
    edgeFunctionApiKey: EDGE_FUNCTION_API_KEY,
    from: EMAIL_FROM_ADDRESS,
    logger: console,
    onEvent: trackOperationalEvent,
  };

  const hasEmailService =
    typeof EmailService !== "undefined" &&
    typeof EmailService.triggerConfirmationEmail === "function";

  try {
    if (hasEmailService) {
      await EmailService.triggerConfirmationEmail(fetch, requestPayload);
      return;
    }

    trackOperationalEvent({
      level: "warn",
      code: "email_service_missing_fallback",
      message: "Falling back to direct fetch because EmailService is unavailable.",
    });

    const fallbackHeaders = {
      "Content-Type": "application/json",
    };
    if (EDGE_FUNCTION_API_KEY) {
      fallbackHeaders.apikey = EDGE_FUNCTION_API_KEY;
      fallbackHeaders.Authorization = `Bearer ${EDGE_FUNCTION_API_KEY}`;
    }

    const fallbackResponse = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: fallbackHeaders,
      body: JSON.stringify({
        email: email,
        role: role,
        from: EMAIL_FROM_ADDRESS,
      }),
    });

    if (fallbackResponse?.ok) {
      trackOperationalEvent({
        level: "info",
        code: "fallback_request_success",
        status: fallbackResponse.status,
      });
      return;
    }

    const fallbackBody = await fallbackResponse.text();
    trackOperationalEvent({
      level: "error",
      code: "fallback_http_error",
      status: fallbackResponse.status,
      message: fallbackBody,
    });
    throw new Error(
      `Email trigger failed (${fallbackResponse.status} ${fallbackResponse.statusText}): ${fallbackBody}`
    );
  } catch (emailError) {
    trackOperationalEvent({
      level: "error",
      code: "trigger_confirmation_failed",
      message: String(emailError?.message || emailError),
    });
    console.error("Email trigger failed:", emailError);
  }
}

async function submitLead(formElement, inputElement, messageElement) {
  const email = inputElement.value.trim();
  const selectedRole = formElement.querySelector('input[name="role"]')?.value;
  const normalizedRole = selectedRole === "teacher" ? "teacher" : "student";

  if (!email) {
    messageElement.innerText = "Please enter your email";
    messageElement.classList.add("is-error");
    return;
  }

  if (!inputElement.checkValidity()) {
    messageElement.innerText = "Please enter a valid email";
    messageElement.classList.add("is-error");
    return;
  }

  if (
    !supabaseClient ||
    SUPABASE_URL === "YOUR_SUPABASE_URL" ||
    SUPABASE_KEY === "YOUR_SUPABASE_PUBLISHABLE_KEY"
  ) {
    messageElement.innerText = "Please configure Supabase URL and key first.";
    messageElement.classList.add("is-error");
    return;
  }

  const leadPayload = { email };

  if (selectedRole === "student" || selectedRole === "teacher") {
    leadPayload.role = selectedRole;
  }

  let { error } = await supabaseClient.from("leads").insert([leadPayload]);

  if (
    error &&
    leadPayload.role &&
    isRoleColumnIssue(error) &&
    !isDuplicateError(error)
  ) {
    const retryResult = await supabaseClient.from("leads").insert([{ email }]);
    error = retryResult.error;
  }

  if (error) {
    if (isDuplicateError(error)) {
      messageElement.innerText = "الإيميل ده مسجل بالفعل 👌";
      messageElement.classList.remove("is-error");
      return;
    }

    console.error(error);
    messageElement.innerText = "حصل خطأ حاول تاني";
    messageElement.classList.add("is-error");
    return;
  }

  await triggerConfirmationEmail(email, normalizedRole);

  messageElement.innerText = "تم التسجيل بنجاح 🔥";
  messageElement.classList.remove("is-error");
  formElement.reset();

  if (formElement.id === "email-form") {
    setSelectedRole("student");
  }
}

if (form && emailInput && message) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitLead(form, emailInput, message);
  });
}

emailForms.forEach((currentForm) => {
  if (currentForm.id === "email-form") {
    return;
  }

  const input = currentForm.querySelector('input[type="email"]');
  const formMessage = currentForm.parentElement.querySelector(".form-message");

  if (!input || !formMessage) {
    return;
  }

  currentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitLead(currentForm, input, formMessage);
  });
});

const comingSoonTimeElement = document.getElementById("coming-soon-time");

function nextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}

function formatTwoDigits(value) {
  return String(value).padStart(2, "0");
}

function startComingSoonCountdown() {
  if (!comingSoonTimeElement) {
    return;
  }

  let targetTime = nextMidnight();

  const updateCountdown = () => {
    const now = new Date();
    let diffMs = targetTime.getTime() - now.getTime();

    if (diffMs <= 0) {
      targetTime = nextMidnight();
      diffMs = targetTime.getTime() - now.getTime();
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    comingSoonTimeElement.textContent = `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
  };

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

startComingSoonCountdown();
