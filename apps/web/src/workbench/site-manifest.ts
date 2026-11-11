import { AUTH_PROVIDERS } from "#scripts/lib/auth-providers.ts";

const SITE_PUBLISHER = "interview-prep";
const SITE_NAME = "site";
const SITE_CATEGORY = "Interview Prep";
export const SITE_EXTENSION_ID = `${SITE_PUBLISHER}.${SITE_NAME}`;

export const GOOGLE_LOGO_PATH = "media/google-logo.svg";

export const SIGNED_OUT_CONTEXT_KEY = "interviewPrepSite.isSignedOut";
export const SIGNED_IN_CONTEXT_KEY = "interviewPrepSite.isSignedIn";

const TITLE_BAR_GROUP = "navigation@100";

export const SiteCommand = {
  openRepository: "interviewPrepSite.openRepository",
  signIn: "interviewPrepSite.signIn",
  account: "interviewPrepSite.account",
  showGeminiLive: "interviewPrepSite.showGeminiLive",
  startVoiceTutor: "interviewPrepSite.startVoiceTutor",
  voiceTutorMenu: "interviewPrepSite.voiceTutorMenu"
} as const;

export const SITE_EXTENSION_MANIFEST = {
  name: SITE_NAME,
  publisher: SITE_PUBLISHER,
  displayName: SITE_CATEGORY,
  version: "1.0.0",
  engines: {
    vscode: "*"
  },
  activationEvents: ["*"],
  contributes: {
    authentication: AUTH_PROVIDERS.map(({ id, label }) => ({
      id,
      label
    })),
    menus: {
      "editor/title": [
        {
          command: SiteCommand.signIn,
          when: SIGNED_OUT_CONTEXT_KEY,
          group: TITLE_BAR_GROUP
        },
        {
          command: SiteCommand.account,
          when: SIGNED_IN_CONTEXT_KEY,
          group: TITLE_BAR_GROUP
        },
        {
          command: SiteCommand.openRepository,
          group: TITLE_BAR_GROUP
        }
      ]
    },
    commands: [
      {
        command: SiteCommand.openRepository,
        title: "Open the Source Code on GitHub",
        category: SITE_CATEGORY,
        icon: "$(github)"
      },
      {
        command: SiteCommand.signIn,
        title: "Sign In with Google to Sync Progress",
        category: SITE_CATEGORY,
        icon: {
          light: GOOGLE_LOGO_PATH,
          dark: GOOGLE_LOGO_PATH
        }
      },
      {
        command: SiteCommand.account,
        title: "Signed In Account and Sign Out",
        category: SITE_CATEGORY,
        icon: "$(account)"
      },
      {
        command: SiteCommand.startVoiceTutor,
        title: "Start the Voice Tutor",
        category: SITE_CATEGORY
      },
      {
        command: SiteCommand.voiceTutorMenu,
        title: "Voice Tutor Options",
        category: SITE_CATEGORY
      },
      {
        command: SiteCommand.showGeminiLive,
        title: "Get the Gemini Live Voice Tutor",
        category: SITE_CATEGORY
      }
    ]
  }
};
