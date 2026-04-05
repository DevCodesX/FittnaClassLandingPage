# Fittna Landing Page Runbook

## Incident: Site Unreachable

### Symptoms
- Browser shows `ERR_NAME_NOT_RESOLVED` or `ERR_TUNNEL_CONNECTION_FAILED`
- Console may show blocked frame errors from `chrome-error://chromewebdata`
- App JavaScript does not execute because the domain is not reachable

### Root Cause Pattern
- DNS for `fittnaclass.online` is missing, expired, or misconfigured
- Domain-level outage occurs before HTML/JS is served

## Immediate Triage

1. Check DNS resolution:
   - `nslookup fittnaclass.online`
2. Check static app availability:
   - Open `https://fittnaclass.online`
3. Check edge function availability:
   - Open `https://aukkolqcucuzifmdeqkc.supabase.co/functions/v1/clever-handler`

## Monitoring

Run:

```bash
node healthcheck.js
```

Optional target overrides:

```bash
APP_URL=https://fittnaclass.online EDGE_FUNCTION_URL=https://aukkolqcucuzifmdeqkc.supabase.co/functions/v1/clever-handler node healthcheck.js
```

The command prints a JSON report and exits with code `1` when any critical check fails. HTTP checks consider `2xx` to `4xx` reachable for endpoint health.

## Client-Side Operational Logging

- `script.js` emits operational events with `trackOperationalEvent`
- `emailService.js` emits request lifecycle events and validation/network/http failures
- Optional remote monitor endpoint can be enabled by setting:
  - `window.__FITTNA_MONITOR_ENDPOINT__ = "https://<monitor-endpoint>"`

## Recovery Actions

1. Fix DNS records for `fittnaclass.online` at registrar/DNS provider
2. Ensure A/AAAA/CNAME records point to active hosting
3. Re-run `node healthcheck.js` until all checks return healthy
4. Validate submit flow and confirmation-email trigger in browser

## Regression Verification

Run:

```bash
node --test "tests/*.test.js"
```

Expected: all tests pass.
