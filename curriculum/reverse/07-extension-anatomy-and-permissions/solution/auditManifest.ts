export type Severity = "high" | "medium" | "low";

export type Finding = {
  rule: string;
  severity: Severity;
  subject: string;
};

export type Manifest = {
  manifest_version?: number;
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: { matches?: string[] }[];
  content_security_policy?: string | { extension_pages?: string };
  web_accessible_resources?: (string | { resources?: string[]; matches?: string[] })[];
};

const Rule = {
  broadHostAccess: "broad-host-access",
  broadContentScript: "broad-content-script",
  riskyPermission: "risky-permission",
  remoteCode: "remote-code",
  openWebAccessibleResources: "open-web-accessible-resources",
  oldManifestVersion: "old-manifest-version"
} as const;

const BROAD_PATTERNS = new Set(["<all_urls>", "*://*/*", "http://*/*", "https://*/*"]);
const PERMISSION_SEVERITY: Record<string, Severity> = {
  debugger: "high",
  proxy: "high",
  cookies: "high",
  webRequest: "medium",
  history: "medium",
  tabs: "medium",
  clipboardRead: "medium",
  nativeMessaging: "medium",
  management: "medium",
  declarativeNetRequest: "medium",
  downloads: "low"
};
const CURRENT_MANIFEST_VERSION = 3;
const ALL_URLS = "<all_urls>";
const SCHEME_SEPARATOR = "://";
const SCRIPT_SRC = "script-src";
const UNSAFE_EVAL = "'unsafe-eval'";
const REMOTE_SOURCE = /^https?:\/\//;
const DIRECTIVE_SEPARATOR = ";";

const isHostPattern = (permission: string) => permission === ALL_URLS || permission.includes(SCHEME_SEPARATOR);

const broadOnly = (patterns: string[]) => patterns.filter(pattern => BROAD_PATTERNS.has(pattern));

const toFindings = ({ rule, severity, subjects }: { rule: string; severity: Severity; subjects: string[] }): Finding[] =>
  subjects.map(subject => ({ rule, severity, subject }));

const hostAccessFindings = ({ host_permissions = [], permissions = [] }: Manifest) =>
  toFindings({
    rule: Rule.broadHostAccess,
    severity: "high",
    subjects: broadOnly([...host_permissions, ...permissions.filter(isHostPattern)])
  });

const contentScriptFindings = ({ content_scripts = [] }: Manifest) =>
  toFindings({
    rule: Rule.broadContentScript,
    severity: "high",
    subjects: broadOnly(content_scripts.flatMap(({ matches = [] }) => matches))
  });

const permissionFindings = ({ permissions = [] }: Manifest) =>
  permissions
    .filter(permission => permission in PERMISSION_SEVERITY)
    .map(permission => ({ rule: Rule.riskyPermission, severity: PERMISSION_SEVERITY[permission], subject: permission }));

const policyOf = ({ content_security_policy }: Manifest) =>
  typeof content_security_policy === "string" ? content_security_policy : (content_security_policy?.extension_pages ?? "");

const scriptSourcesOf = (policy: string) => {
  const directives = policy.split(DIRECTIVE_SEPARATOR).map(directive => directive.trim().split(/\s+/));
  const [, ...sources] = directives.find(([name]) => name === SCRIPT_SRC) ?? [];
  return sources;
};

const remoteCodeFindings = (manifest: Manifest) =>
  toFindings({
    rule: Rule.remoteCode,
    severity: "high",
    subjects: scriptSourcesOf(policyOf(manifest)).filter(source => source === UNSAFE_EVAL || REMOTE_SOURCE.test(source))
  });

const resourceFindings = ({ web_accessible_resources = [] }: Manifest) =>
  toFindings({
    rule: Rule.openWebAccessibleResources,
    severity: "medium",
    subjects: broadOnly(web_accessible_resources.flatMap(entry => (typeof entry === "string" ? [] : (entry.matches ?? []))))
  });

const versionFindings = ({ manifest_version }: Manifest) =>
  manifest_version === CURRENT_MANIFEST_VERSION
    ? []
    : toFindings({ rule: Rule.oldManifestVersion, severity: "medium", subjects: [String(manifest_version)] });

const withoutRepeats = (findings: Finding[]) => [...new Map(findings.map(finding => [`${finding.rule}|${finding.subject}`, finding])).values()];

export function auditManifest(manifest: Manifest) {
  return withoutRepeats([
    ...versionFindings(manifest),
    ...hostAccessFindings(manifest),
    ...contentScriptFindings(manifest),
    ...permissionFindings(manifest),
    ...remoteCodeFindings(manifest),
    ...resourceFindings(manifest)
  ]);
}
