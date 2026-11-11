import { fileURLToPath } from "node:url";

const PATH_SEPARATOR = "/";
const TRAILING_SEPARATOR = /\/$/;

function packagePath(relativePath: string) {
  return fileURLToPath(new URL(relativePath, import.meta.url)).replaceAll("\\", PATH_SEPARATOR).replace(TRAILING_SEPARATOR, "");
}

const PACKAGE_DIR = packagePath("..");

export const SOURCE_ALIASES = {
  "@scripts": packagePath("../../../scripts"),
  "@manifest": packagePath("../package.json"),
  "@": packagePath(".")
} as const;

export function resolveSourceAlias(source: string) {
  for (const [alias, target] of Object.entries(SOURCE_ALIASES)) {
    if (source === alias) {
      return target;
    }

    if (source.startsWith(`${alias}${PATH_SEPARATOR}`)) {
      return `${target}${source.slice(alias.length)}`;
    }
  }
  return null;
}

function isInsidePackage(importer: string) {
  return importer.replaceAll("\\", PATH_SEPARATOR).toLowerCase().startsWith(`${PACKAGE_DIR}${PATH_SEPARATOR}`.toLowerCase());
}

export function extensionSourceAliases() {
  return {
    name: "interview-prep-extension-aliases",
    enforce: "pre" as const,
    resolveId(source: string, importer: string | undefined) {
      return importer && isInsidePackage(importer) ? resolveSourceAlias(source) : null;
    }
  };
}
