import type { FirebaseConfig } from "@/lib/firebase-config.ts";
import type { IdToken } from "@/lib/progress-store.ts";
import { z } from "@/lib/zod.ts";
import type { User } from "firebase/auth";

export type Account = {
  uid: string;
  name: string;
  photoUrl: string | null;
  providerId: string | undefined;
  idToken: IdToken;
};

export type AuthControls = {
  signIn(): Promise<Account>;
  signOut(): Promise<void>;
};

const SignInErrorCode = {
  popupBlocked: "auth/popup-blocked",
  popupClosed: "auth/popup-closed-by-user",
  popupCancelled: "auth/cancelled-popup-request",
  unauthorizedDomain: "auth/unauthorized-domain",
  networkFailed: "auth/network-request-failed"
} as const;

const SIGN_IN_ERROR_TEXT: Record<string, string> = {
  [SignInErrorCode.popupBlocked]: "The browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  [SignInErrorCode.popupClosed]: "Sign-in was cancelled.",
  [SignInErrorCode.popupCancelled]: "Sign-in was cancelled.",
  [SignInErrorCode.unauthorizedDomain]: "Sign-in is not allowed on this address.",
  [SignInErrorCode.networkFailed]: "Could not reach Google. Check your connection and try again."
};

const FALLBACK_SIGN_IN_ERROR = "Sign-in failed. Try again.";
const FALLBACK_NAME = "Signed in";

const errorCodeSchema = z.object({ code: z.string() });

export function signInErrorText(error: unknown) {
  const parsed = errorCodeSchema.safeParse(error);
  if (!parsed.success) {
    return FALLBACK_SIGN_IN_ERROR;
  }

  return SIGN_IN_ERROR_TEXT[parsed.data.code] ?? FALLBACK_SIGN_IN_ERROR;
}

function accountOf(user: User): Account {
  return {
    uid: user.uid,
    name: user.displayName ?? user.email ?? FALLBACK_NAME,
    photoUrl: user.photoURL,
    providerId: user.providerData[0]?.providerId,
    idToken: isForcedRefresh => user.getIdToken(isForcedRefresh)
  };
}

export async function connectAuth({ config, onAccount }: {
  config: FirebaseConfig;
  onAccount: (account: Account | null) => void;
}): Promise<AuthControls> {
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
