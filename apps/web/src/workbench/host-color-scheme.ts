import { IHostColorSchemeService } from "@codingame/monaco-vscode-api/services";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const HIGH_CONTRAST_QUERY = "(forced-colors: active)";

export function getHostColorSchemeOverride() {
  const darkMedia = matchMedia(DARK_QUERY);
  const highContrastMedia = matchMedia(HIGH_CONTRAST_QUERY);
  const service: IHostColorSchemeService = {
    _serviceBrand: undefined,
    get dark() {
      return darkMedia.matches;
    },
    get highContrast() {
      return highContrastMedia.matches;
    },
    onDidChangeColorScheme(listener) {
      function notify() {
        listener(undefined);
      }

      darkMedia.addEventListener("change", notify);
      highContrastMedia.addEventListener("change", notify);
      return {
        dispose() {
          darkMedia.removeEventListener("change", notify);
          highContrastMedia.removeEventListener("change", notify);
        }
      };
    }
  };
  return { [IHostColorSchemeService.toString()]: service };
}
