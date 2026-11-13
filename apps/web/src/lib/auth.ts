import type { User } from "firebase/auth";

import type { FirebaseConfig } from "@/lib/firebase-config.ts";
import type { IdToken } from "@/lib/progress-store.ts";
import { zod } from "@/lib/zod.ts";

export interface Account {
  uid: string;
  name: string;
  photoUrl: string | null;
  providerId: string | undefined;
  idToken: IdToken;
}

export interface AuthControls {
  signIn(): Promise<Account>;
  signOut(): Promise<void>;
}

const SignInErrorCode = {
  POPUP_BLOCKED: "auth/popup-blocked",
  POPUP_CLOSED: "auth/popup-closed-by-user",
  POPUP_CANCELLED: "auth/cancelled-popup-request",
  UNAUTHORIZED_DOMAIN: "auth/unauthorized-domain",
  NETWORK_FAILED: "auth/network-request-failed"
} as const;

const SIGN_IN_ERROR_TEXT: Record<string, string> = {
  [SignInErrorCode.POPUP_BLOCKED]: "The browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  [SignInErrorCode.POPUP_CLOSED]: "Sign-in was cancelled.",
  [SignInErrorCode.POPUP_CANCELLED]: "Sign-in was cancelled.",
  [SignInErrorCode.UNAUTHORIZED_DOMAIN]: "Sign-in is not allowed on this address.",
  [SignInErrorCode.NETWORK_FAILED]: "Could not reach Google. Check your connection and try again."
};

const FALLBACK_SIGN_IN_ERROR = "Sign-in failed. Try again.";
const FALLBACK_NAME = "Signed in";

const errorCodeSchema = zod.object({ code: zod.string() });

export function signInErrorText(error: unknown) {
  const parsed = errorCodeSchema.safeParse(error);
  if (!parsed.success) {
    return FALLBACK_SIGN_IN_ERROR;
  }

  return SIGN_IN_ERROR_TEXT[parsed.data.code] ?? FALLBACK_SIGN_IN_ERROR;
}

function accountOf(user: User) {
  return {
    uid: user.uid,
    name: user.displayName ?? user.email ?? FALLBACK_NAME,
    photoUrl: user.photoURL,
    providerId: user.providerData[0]?.providerId,
    idToken: isForcedRefresh => user.getIdToken(isForcedRefresh)
  } satisfies Account;
}

export async function connectAuth({
  config,
  onAccount
}: {
  config: FirebaseConfig;
  onAccount: (account: Account | null) => void;
}) {
  const [{ initializeApp }, firebaseAuth] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const auth = firebaseAuth.getAuth(initializeApp(config));
  firebaseAuth.onAuthStateChanged(auth, user => onAccount(user ? accountOf(user) : null));
  return {
    async signIn() {
      const { user } = await firebaseAuth.signInWithPopup(auth, new firebaseAuth.GoogleAuthProvider());
      return accountOf(user);
    },
    signOut: () => firebaseAuth.signOut(auth)
  };
}
