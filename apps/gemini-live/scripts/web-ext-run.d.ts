declare module "web-ext-run" {
  interface ExtensionRunner {
    reloadAllExtensions: () => Promise<unknown>;
    exit: () => Promise<void>;
    registerCleanup: (cleanup: () => void) => void;
  }

  interface ChromiumRunOptions {
    target: "chromium"[];
    sourceDir: string;
    chromiumBinary: string;
    chromiumProfile: string;
    profileCreateIfMissing: boolean;
    keepProfileChanges: boolean;
    startUrl: string[];
    args: string[];
    noReload: boolean;
    noInput: boolean;
  }

  const webExtRun: {
    cmd: {
      run: (options: ChromiumRunOptions, config: { shouldExitProgram: boolean }) => Promise<ExtensionRunner>;
    };
  };
  export default webExtRun;
}
