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
  web_accessible_resources?: (string | {
    resources?: string[];
    matches?: string[];
  })[];
};

export function auditManifest(_manifest: Manifest) {
  const findings: Finding[] = [];
  return findings;
}
