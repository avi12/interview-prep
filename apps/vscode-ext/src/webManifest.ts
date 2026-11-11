import packageJson from "@manifest" with { type: "json" };

const WEB_ACTIVATION_EVENTS = ["*"];

export const WEB_EXTENSION_MANIFEST = {
  name: packageJson.name,
  displayName: packageJson.displayName,
  description: packageJson.description,
  publisher: packageJson.publisher,
  version: packageJson.version,
  license: packageJson.license,
  engines: packageJson.engines,
  categories: packageJson.categories,
  activationEvents: WEB_ACTIVATION_EVENTS,
  contributes: packageJson.contributes,
  capabilities: packageJson.capabilities
};
