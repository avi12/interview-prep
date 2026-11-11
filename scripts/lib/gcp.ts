export const GCP = {
  projectId: "avi-interview-prep",
  hostingSiteId: "avi-interview-prep",
  region: "europe-west1",
  firestoreLocation: "eur3",
  runService: "interview-prep-web",
  runtimeServiceAccountName: "interview-prep-web",
  artifactRepository: "interview-prep",
  buildServiceAccountName: "interview-prep-web-build"
} as const;

export const WEB_ORIGIN = `https://${GCP.hostingSiteId}.web.app`;
export const FIREBASE_AUTH_ORIGIN = `https://${GCP.projectId}.firebaseapp.com`;
export const USERS_COLLECTION = "users";

export const HEALTH_PATH = "/health";
