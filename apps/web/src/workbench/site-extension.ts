import { type Account, type AuthControls, connectAuth, signInErrorText } from "@/lib/auth.ts";
import { loadFirebaseConfig } from "@/lib/firebase-config.ts";
import { type ProgressSession, SyncState } from "@/lib/progress-session.ts";
import { createRemoteProgressStore } from "@/lib/progress-store.ts";
import { reloadForUpdate } from "@/lib/reload.ts";
import { watchForUpdates } from "@/lib/update-check.ts";
import { geminiLiveGuide } from "@/workbench/gemini-live-guide.ts";
import googleLogoUrl from "@/workbench/google-logo.svg?url";
import {
  GOOGLE_LOGO_PATH,
  SIGNED_IN_CONTEXT_KEY,
  SIGNED_OUT_CONTEXT_KEY,
  SITE_EXTENSION_MANIFEST,
  SiteCommand
} from "@/workbench/site-manifest.ts";
import { ExtensionHostKind, registerExtension } from "@codingame/monaco-vscode-api/extensions";
import { AUTH_PROVIDERS } from "#scripts/lib/auth-providers.ts";
import { REPOSITORY_URL } from "#scripts/lib/repository.ts";
import type * as vscode from "vscode";

type Api = typeof vscode;

const LOADING_REASON = "Sign-in is still loading. Try again in a moment.";
const NO_SCOPES: readonly string[] = [];
const NO_SESSIONS: readonly vscode.AuthenticationSession[] = [];
const REPOSITORY_ITEM_ID = "interviewPrepSite.repository";
const SYNC_ITEM_ID = "interviewPrepSite.sync";
const ACCOUNT_ITEM_ID = "interviewPrepSite.account";
const VOICE_TUTOR_ITEM_ID = "interviewPrepSite.voiceTutor";
const STATUS_PRIORITY = 100;
const SET_CONTEXT_COMMAND = "setContext";

const SYNC_STATUS = {
  [SyncState.local]: {
    text: "$(device-desktop) Progress on this device",
    tooltip: "Sign in to keep your progress on every device",
    isSignInOffered: true,
    isSignOutOffered: false
  },
  [SyncState.syncing]: {
    text: "$(sync~spin) Syncing progress",
    tooltip: "Merging this device's progress into your account",
    isSignInOffered: false,
    isSignOutOffered: false
  },
  [SyncState.synced]: {
    text: "$(cloud) Progress synced",
    tooltip: "Your progress is saved to your account. Click to sign out; it stays on this device",
    isSignInOffered: false,
    isSignOutOffered: true
  },
  [SyncState.failed]: {
    text: "$(warning) Progress not synced",
    tooltip: "Your progress is kept on this device until the sync works again. Click to sign out",
    isSignInOffered: false,
    isSignOutOffered: true
  }
} as const satisfies Record<SyncState, {
  text: string;
  tooltip: string;
  isSignInOffered: boolean;
  isSignOutOffered: boolean;
}>;

export function registerSiteExtension() {
  const extension = registerExtension(SITE_EXTENSION_MANIFEST, ExtensionHostKind.LocalProcess);
  extension.registerFileUrl(GOOGLE_LOGO_PATH, new URL(googleLogoUrl, location.href).href);
  return extension;
}

async function sessionOf(account: Account): Promise<vscode.AuthenticationSession> {
  return {
    id: account.uid,
    accessToken: await account.idToken(false),
    account: {
      id: account.uid,
      label: account.name
    },
    scopes: NO_SCOPES
  };
}

function registerAuthProviders({ api, session }: {
  api: Api;
  session: ProgressSession;
}) {
  const emitters = new Map(AUTH_PROVIDERS.map(provider => [
    provider.id,
    new api.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>()
  ]));
  let account: Account | null = null;
  let controls: AuthControls | null = null;
  let unavailableReason = LOADING_REASON;

  function accountOfProvider({ firebaseProviderId }: { firebaseProviderId: string }) {
    return account?.providerId === firebaseProviderId ? account : null;
  }

  async function fireChange({ added, removed }: {
    added: Account | null;
    removed: Account | null;
  }) {
    for (const provider of AUTH_PROVIDERS) {
      const emitter = emitters.get(provider.id);
      const isAdded = added?.providerId === provider.firebaseProviderId;
      const isRemoved = removed?.providerId === provider.firebaseProviderId;
      emitter?.fire({
        added: isAdded && added ? [await sessionOf(added)] : NO_SESSIONS,
        removed: isRemoved && removed ? [await sessionOf(removed)] : NO_SESSIONS,
        changed: NO_SESSIONS
      });
    }
  }

  const accountItem = api.window.createStatusBarItem(
    ACCOUNT_ITEM_ID,
    api.StatusBarAlignment.Right,
    STATUS_PRIORITY + 1
  );
  accountItem.command = SiteCommand.account;
  accountItem.tooltip = "Account options, including sign out. Your progress stays on this device";

  async function showAccount(signedIn: Account | null) {
    const previous = account;
    account = signedIn;

    if (signedIn) {
      accountItem.text = `$(account) Signed in as ${signedIn.name}`;
      accountItem.show();
    } else {
      accountItem.hide();
    }

    if (signedIn) {
      void session.showAccount(
        createRemoteProgressStore({
          fetchJson: fetch,
          idToken: signedIn.idToken
        })
      );
      await fireChange({
        added: signedIn,
        removed: null
      });
      return;
    }

    void session.showLocal();
    await fireChange({
      added: null,
      removed: previous
    });
  }

  async function connect() {
    const result = await loadFirebaseConfig({
      fetchJson: fetch,
      env: import.meta.env
    });
    if (!result.isReady) {
      unavailableReason = result.reason;
      return;
    }

    controls = await connectAuth({
      config: result.config,
      onAccount: signedIn => void showAccount(signedIn)
    });
  }

  const registrations = AUTH_PROVIDERS.map(provider => api.authentication.registerAuthenticationProvider(
    provider.id,
    provider.label,
    {
      onDidChangeSessions: emitters.get(provider.id)?.event ?? new api.EventEmitter<never>().event,
      async getSessions() {
        const matching = accountOfProvider(provider);
        return matching ? [await sessionOf(matching)] : [];
      },
      async createSession() {
        if (!controls) {
          throw new Error(unavailableReason);
        }

        const signedIn = await controls.signIn().catch((error: unknown) => {
          throw new Error(signInErrorText(error));
        });
        return sessionOf(signedIn);
      },
      async removeSession() {
        await controls?.signOut();
      }
    }
  ));
  void connect();

  async function signIn() {
    if (!controls) {
      void api.window.showErrorMessage(unavailableReason);
      return;
    }

    await controls.signIn().then(
      () => undefined,
      (error: unknown) => void api.window.showErrorMessage(signInErrorText(error))
    );
  }

  async function signOut() {
    await controls?.signOut();
  }

  async function showAccountMenu() {
    if (!account) {
      return;
    }

    const signOutLabel = "Sign out";
    const picked = await api.window.showInformationMessage(
      `Signed in as ${account.name}. If you sign out, your progress stays on this device.`,
      signOutLabel
    );
    if (picked === signOutLabel) {
      await signOut();
    }
  }

  return {
    disposables: [...registrations, ...emitters.values(), accountItem],
    signIn,
    showAccountMenu
  };
}

function showSyncStatus({ api, session }: {
  api: Api;
  session: ProgressSession;
}) {
  const item = api.window.createStatusBarItem(SYNC_ITEM_ID, api.StatusBarAlignment.Right, STATUS_PRIORITY);
  function render() {
    const { text, tooltip, isSignInOffered, isSignOutOffered } = SYNC_STATUS[session.syncState];
    item.text = text;
    item.tooltip = tooltip;
    item.command = undefined;

    if (isSignInOffered) {
      item.command = SiteCommand.signIn;
    }

    if (isSignOutOffered) {
      item.command = SiteCommand.account;
    }

    void api.commands.executeCommand(SET_CONTEXT_COMMAND, SIGNED_OUT_CONTEXT_KEY, isSignInOffered);
    void api.commands.executeCommand(SET_CONTEXT_COMMAND, SIGNED_IN_CONTEXT_KEY, isSignOutOffered);
  }

  render();
  item.show();
  const unsubscribe = session.subscribe(render);
  return [item, new api.Disposable(unsubscribe)];
}

function showRepositoryLink(api: Api) {
  const item = api.window.createStatusBarItem(REPOSITORY_ITEM_ID, api.StatusBarAlignment.Right, STATUS_PRIORITY);
  item.text = "$(github) Source";
  item.tooltip = "Open the source code on GitHub";
  item.command = SiteCommand.openRepository;
  item.show();
  return item;
}

function showVoiceTutorLink(api: Api) {
  const item = api.window.createStatusBarItem(VOICE_TUTOR_ITEM_ID, api.StatusBarAlignment.Right, STATUS_PRIORITY);
  item.text = "$(mic) Voice tutor";
  item.tooltip = "Get the Gemini Live voice tutor, a spoken coach that sees your lesson and your code";
  item.command = SiteCommand.showGeminiLive;
  item.show();
  return item;
}

function reloadOnDeploy(api: Api) {
  const stopWatching = watchForUpdates({
    currentVersion: __APP_VERSION__,
    async onUpdate() {
      await api.workspace.saveAll(false);
      reloadForUpdate();
    }
  });
  return new api.Disposable(stopWatching);
}

export async function activateSiteExtension({ extension, session }: {
  extension: ReturnType<typeof registerSiteExtension>;
  session: ProgressSession;
}) {
  const api = await extension.getApi();
  const auth = registerAuthProviders({
    api,
    session
  });
  const disposables = [
    ...auth.disposables,
    ...showSyncStatus({
      api,
      session
    }),
    showRepositoryLink(api),
    showVoiceTutorLink(api),
    reloadOnDeploy(api),
    api.commands.registerCommand(SiteCommand.openRepository, () => api.env.openExternal(api.Uri.parse(REPOSITORY_URL))),
    api.commands.registerCommand(SiteCommand.signIn, auth.signIn),
    api.commands.registerCommand(SiteCommand.account, auth.showAccountMenu),
    api.commands.registerCommand(SiteCommand.showGeminiLive, async () => {
      const { showMarkdownGuide } = await import("interview-prep/src/markdownGuide.ts");
      await showMarkdownGuide(geminiLiveGuide());
    })
  ];
  for (const provider of AUTH_PROVIDERS) {
    void api.authentication.getSession(provider.id, NO_SCOPES, { createIfNone: false });
  }
  return new api.Disposable(() => {
    for (const disposable of disposables) {
      disposable.dispose();
    }
  });
}
