import { FIREBASE_AUTH_ORIGIN } from "#scripts/lib/gcp.ts";
import type { Context, Next } from "hono";
import { secureHeaders } from "hono/secure-headers";

const CSP_HEADER = "content-security-policy";
const CORP_HEADER = "cross-origin-resource-policy";
const HSTS = "max-age=31536000; includeSubDomains";
const SAME_ORIGIN_RESOURCE = "same-origin";

const GOOGLE_FONTS_STYLES = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

const CspSource = {
  self: "'self'",
  none: "'none'",
  unsafeInline: "'unsafe-inline'",
  wasmUnsafeEval: "'wasm-unsafe-eval'",
  blob: "blob:",
  data: "data:"
} as const;

type Directives = Record<string, readonly string[]>;

function policy(directives: Directives) {
  return Object.entries(directives).map(([name, sources]) => [name, ...sources].join(" ")).join("; ");
}

const LOCKED_DOWN = {
  "object-src": [CspSource.none],
  "base-uri": [CspSource.none]
} satisfies Directives;

const GOOGLE_SIGN_IN = {
  "script-src": ["https://apis.google.com"],
  "connect-src": [
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://www.googleapis.com"
  ],
  "frame-src": [FIREBASE_AUTH_ORIGIN, "https://accounts.google.com"],
  "img-src": ["https://lh3.googleusercontent.com"]
} satisfies Directives;

const WORKBENCH = {
  "script-src": [CspSource.wasmUnsafeEval],
  "worker-src": [CspSource.self, CspSource.blob],
  "frame-src": [CspSource.self],
  "img-src": [CspSource.self, CspSource.data],
  "font-src": [CspSource.self]
} satisfies Directives;

const TEST_RUNNER_WORKER = {
  "default-src": [CspSource.none],
  "script-src": [CspSource.self, CspSource.blob, CspSource.wasmUnsafeEval],
  "worker-src": [CspSource.self],
  "connect-src": [CspSource.self]
} satisfies Directives;

const APP_CSP = policy({
  "default-src": [CspSource.self],
  "script-src": [CspSource.self, ...WORKBENCH["script-src"], ...GOOGLE_SIGN_IN["script-src"]],
  "worker-src": WORKBENCH["worker-src"],
  "connect-src": [CspSource.self, ...GOOGLE_SIGN_IN["connect-src"]],
  "frame-src": [...WORKBENCH["frame-src"], ...GOOGLE_SIGN_IN["frame-src"]],
  "img-src": [...WORKBENCH["img-src"], ...GOOGLE_SIGN_IN["img-src"]],
  "style-src": [CspSource.self, CspSource.unsafeInline, GOOGLE_FONTS_STYLES],
  "font-src": [...WORKBENCH["font-src"], GOOGLE_FONTS_FILES],
  ...LOCKED_DOWN,
  "form-action": [CspSource.self],
  "frame-ancestors": [CspSource.none]
});

export const RUNNER_WORKER_CSP = policy({
  ...TEST_RUNNER_WORKER,
  ...LOCKED_DOWN
});

export const WEBVIEW_HOST_CSP = policy({
  "frame-ancestors": [CspSource.self]
});

const baseHeaders = secureHeaders({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: "same-origin-allow-popups",
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: HSTS,
  permissionsPolicy: {
    accelerometer: [],
    autoplay: ["self"],
    camera: [],
    displayCapture: [],
    fullscreen: ["self"],
    geolocation: [],
    gyroscope: [],
    hid: [],
    magnetometer: [],
    microphone: [],
    midi: [],
    payment: [],
    serial: [],
    usb: []
  }
});

async function defaultPolicies(context: Context, next: Next) {
  await next();

  if (!context.res.headers.has(CSP_HEADER)) {
    context.res.headers.set(CSP_HEADER, APP_CSP);
  }

  if (!context.res.headers.has(CORP_HEADER)) {
    context.res.headers.set(CORP_HEADER, SAME_ORIGIN_RESOURCE);
  }
}

export const securityHeaders = [baseHeaders, defaultPolicies] as const;
