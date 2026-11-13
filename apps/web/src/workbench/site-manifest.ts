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
  OPEN_REPOSITORY: "interviewPrepSite.openRepository",
  SIGN_IN: "interviewPrepSite.signIn",
  ACCOUNT: "interviewPrepSite.account",
  SHOW_GEMINI_LIVE: "interviewPrepSite.showGeminiLive",
  START_VOICE_TUTOR: "interviewPrepSite.startVoiceTutor",
  VOICE_TUTOR_MENU: "interviewPrepSite.voiceTutorMenu"
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
          command: SiteCommand.SIGN_IN,
          when: SIGNED_OUT_CONTEXT_KEY,
          group: TITLE_BAR_GROUP
        },
        {
          command: SiteCommand.ACCOUNT,
          when: SIGNED_IN_CONTEXT_KEY,
          group: TITLE_BAR_GROUP
        },
        {
          command: SiteCommand.OPEN_REPOSITORY,
          group: TITLE_BAR_GROUP
        }
      ]
    },
    commands: [
      {
        command: SiteCommand.OPEN_REPOSITORY,
        title: "Open the Source Code on GitHub",
        category: SITE_CATEGORY,
        icon: "$(github)"
      },
      {
        command: SiteCommand.SIGN_IN,
        title: "Sign In with Google to Sync Progress",
        category: SITE_CATEGORY,
        icon: {
          light: GOOGLE_LOGO_PATH,
          dark: GOOGLE_LOGO_PATH
        }
      },
      {
        command: SiteCommand.ACCOUNT,
        title: "Signed In Account and Sign Out",
        category: SITE_CATEGORY,
        icon: "$(account)"
      },
      {
        command: SiteCommand.START_VOICE_TUTOR,
        title: "Start the Voice Tutor",
        category: SITE_CATEGORY
      },
      {
        command: SiteCommand.VOICE_TUTOR_MENU,
        title: "Voice Tutor Options",
        category: SITE_CATEGORY
      },
      {
        command: SiteCommand.SHOW_GEMINI_LIVE,
        title: "Get the Gemini Live Voice Tutor",
        category: SITE_CATEGORY
      }
    ]
  }
};
