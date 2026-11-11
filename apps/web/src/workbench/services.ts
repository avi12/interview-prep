import { SITE_EXTENSION_ID } from "@/workbench/site-manifest.ts";
import { WORKSPACE_ROOT } from "@/workbench/workspace-files.ts";
import getAccessibilityServiceOverride from "@codingame/monaco-vscode-accessibility-service-override";
import { initialize, LogLevel } from "@codingame/monaco-vscode-api";
import getAuthenticationServiceOverride from "@codingame/monaco-vscode-authentication-service-override";
import getConfigurationServiceOverride, {
  initUserConfiguration
} from "@codingame/monaco-vscode-configuration-service-override";
import getDialogsServiceOverride from "@codingame/monaco-vscode-dialogs-service-override";
import getEnvironmentServiceOverride from "@codingame/monaco-vscode-environment-service-override";
import getExplorerServiceOverride from "@codingame/monaco-vscode-explorer-service-override";
import getExtensionServiceOverride from "@codingame/monaco-vscode-extensions-service-override";
import getFilesServiceOverride from "@codingame/monaco-vscode-files-service-override";
import "@codingame/monaco-vscode-javascript-default-extension";
import "@codingame/monaco-vscode-json-default-extension";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getLifecycleServiceOverride from "@codingame/monaco-vscode-lifecycle-service-override";
import getLogServiceOverride from "@codingame/monaco-vscode-log-service-override";
import "@codingame/monaco-vscode-markdown-basics-default-extension";
import getMarkersServiceOverride from "@codingame/monaco-vscode-markers-service-override";
import getModelServiceOverride from "@codingame/monaco-vscode-model-service-override";
import getNotificationsServiceOverride from "@codingame/monaco-vscode-notifications-service-override";
import getOutputServiceOverride from "@codingame/monaco-vscode-output-service-override";
import getPreferencesServiceOverride from "@codingame/monaco-vscode-preferences-service-override";
import "@codingame/monaco-vscode-python-default-extension";
import getQuickAccessServiceOverride from "@codingame/monaco-vscode-quickaccess-service-override";
import getSearchServiceOverride from "@codingame/monaco-vscode-search-service-override";
import getSecretStorageServiceOverride from "@codingame/monaco-vscode-secret-storage-service-override";
import "@codingame/monaco-vscode-sql-default-extension";
import getStorageServiceOverride from "@codingame/monaco-vscode-storage-service-override";
import getTextmateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import "@codingame/monaco-vscode-theme-defaults-default-extension";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";
import "@codingame/monaco-vscode-theme-seti-default-extension";
import "@codingame/monaco-vscode-typescript-basics-default-extension";
import getWorkbenchServiceOverride from "@codingame/monaco-vscode-workbench-service-override";
import getWorkingCopyServiceOverride from "@codingame/monaco-vscode-working-copy-service-override";
import getWorkspaceTrustServiceOverride from "@codingame/monaco-vscode-workspace-trust-service-override";
import { AUTH_PROVIDERS } from "#scripts/lib/auth-providers.ts";
import { REPOSITORY_URL } from "#scripts/lib/repository.ts";
import "vscode/localExtensionHost";

const PRODUCT_NAME = "Interview Prep";
const IS_WORKER_EXTENSION_HOST_ENABLED = false;

const USER_SETTINGS = {
  "window.autoDetectColorScheme": true,
  "workbench.preferredDarkColorTheme": "Default Dark Modern",
  "workbench.preferredLightColorTheme": "Default Light Modern",
  "workbench.iconTheme": "vs-seti",
  "workbench.startupEditor": "none",
  "workbench.layoutControl.enabled": false,
  "window.commandCenter": true,
  "editor.minimap.enabled": false,
  "files.autoSave": "afterDelay"
};

const TRUSTED_AUTH_ACCESS = Object.fromEntries(
  AUTH_PROVIDERS.map(provider => [provider.id, [SITE_EXTENSION_ID]])
);

export async function startServices(container: HTMLElement) {
  await initUserConfiguration(JSON.stringify(USER_SETTINGS));
  await initialize(
    {
      ...getLogServiceOverride(),
      ...getFilesServiceOverride(),
      ...getConfigurationServiceOverride(),
      ...getExtensionServiceOverride({ enableWorkerExtensionHost: IS_WORKER_EXTENSION_HOST_ENABLED }),
      ...getModelServiceOverride(),
      ...getNotificationsServiceOverride(),
      ...getDialogsServiceOverride(),
      ...getKeybindingsServiceOverride(),
      ...getTextmateServiceOverride(),
      ...getThemeServiceOverride(),
      ...getLanguagesServiceOverride(),
      ...getPreferencesServiceOverride(),
      ...getOutputServiceOverride(),
      ...getSearchServiceOverride(),
      ...getMarkersServiceOverride(),
      ...getAccessibilityServiceOverride(),
      ...getStorageServiceOverride(),
      ...getLifecycleServiceOverride(),
      ...getEnvironmentServiceOverride(),
      ...getWorkspaceTrustServiceOverride(),
      ...getWorkingCopyServiceOverride(),
      ...getExplorerServiceOverride(),
      ...getAuthenticationServiceOverride(),
      ...getSecretStorageServiceOverride(),
      ...getWorkbenchServiceOverride(),
      ...getQuickAccessServiceOverride({
        isKeybindingConfigurationVisible: () => true,
        shouldUseGlobalPicker: () => true
      })
    },
    container,
    {
      enableWorkspaceTrust: false,
      developmentOptions: {
        logLevel: LogLevel.Warning
      },
      productConfiguration: {
        nameShort: PRODUCT_NAME,
        nameLong: PRODUCT_NAME,
        trustedExtensionAuthAccess: TRUSTED_AUTH_ACCESS,
        linkProtectionTrustedDomains: [new URL(REPOSITORY_URL).origin]
      },
      workspaceProvider: {
        trusted: true,
        workspace: {
          folderUri: WORKSPACE_ROOT
        },
        open: async () => false
      }
    }
  );
}
