# Deploying the web trainer

The hosted trainer lives at https://avi-interview-prep.web.app. Firebase Hosting sends every request to one Cloud Run service, which serves the app (VS Code running in the browser, with the course extension registered in the page), the lessons and the progress API. Signed-in progress is stored in Firestore.

Every name (project, site, region, service, service accounts, image repo) comes from `scripts/lib/gcp.ts`. `firebase.json` holds the Hosting rewrite, and the deploy stops if it disagrees with `gcp.ts`.

## Before you start

- The [gcloud CLI](https://cloud.google.com/sdk/docs/install), signed in: `gcloud auth login`
- To run the server locally against real Firestore: `gcloud auth application-default login`
- A billing account. Cloud Run, Cloud Build and Artifact Registry need billing even inside the free tier. List yours with `gcloud billing accounts list`

The scripts never change your gcloud config. They pass `--account` and `--project` on every call and use `gcloud auth print-access-token` for the Firebase REST APIs, so no `firebase login` and no key files. The account defaults to `avi6106@gmail.com`; set `GCLOUD_ACCOUNT` to use another one.

## One-time setup

```sh
pnpm setup:gcp --billing-account=XXXXXX-XXXXXX-XXXXXX
```

Each step checks first and prints whether it acted or skipped, so running it again is safe. `--dry-run` prints every command and request without sending anything.

1. Creates the project (stops if someone else owns the id)
2. Links billing
3. Enables the APIs it needs
4. Adds Firebase to the project
5. Creates the Hosting site
6. Registers a Firebase web app and links it to the site, so `/__/firebase/init.json` serves the client config
7. Creates the Firestore database (native mode, `eur3`)
8. Creates the Docker repo in Artifact Registry
9. Creates two service accounts and grants each only what it needs (below)
10. Releases `firestore.rules`, which blocks all client reads and writes. Only the server touches Firestore
11. Checks the Google sign-in provider and adds the site's domains to Auth's authorized domains

### The one manual step

Google sign-in needs an OAuth client, and no public API creates one for a personal project. Open the [sign-in providers page](https://console.firebase.google.com/project/avi-interview-prep/authentication/providers), click **Get started** if shown, then **Add new provider > Google > Enable**, pick a support email and **Save**. Run `pnpm setup:gcp` again: it confirms the provider is on and adds the authorized domains.

If the app signs in with `authDomain` set to `avi-interview-prep.web.app` (not the `firebaseapp.com` default), also add `https://avi-interview-prep.web.app/__/auth/handler` to the OAuth client's redirect URIs on the [credentials page](https://console.cloud.google.com/apis/credentials?project=avi-interview-prep).

### Who can do what

| Service account                          | Role                                                   | Why                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `interview-prep-web` (Cloud Run)         | `roles/datastore.user`                                 | read and write progress in Firestore                                                                                    |
|                                          | `roles/firebaseauth.viewer`                            | the server checks that a token was not revoked, which reads the user record. Checking the signature alone needs no role |
| `interview-prep-web-build` (Cloud Build) | `roles/artifactregistry.writer` on the image repo only | push the image                                                                                                          |
|                                          | `roles/logging.logWriter`                              | write build logs                                                                                                        |
|                                          | `roles/storage.objectViewer`                           | read the uploaded source                                                                                                |

Cloud Build gets its own account because new projects no longer give it a default one with broad rights.

## Deploy

```sh
pnpm deploy:web
```

1. Builds the lessons into `dist/` and the web app into `apps/web/dist-client` and `apps/web/dist-server`
2. Uploads only what `.gcloudignore` allows and builds the image from `apps/web/Dockerfile` with Cloud Build. The tag is the time plus the git commit, like `20261109-162940-980d332`
3. Deploys that image to Cloud Run. It is public on purpose: Hosting can only forward to a public service, and the API checks Firebase tokens itself
4. Releases a new Hosting version holding only the rewrite from `firebase.json`
5. Checks that `/health` answers 200 and `/__/firebase/init.json` serves the config

`--dry-run` prints the plan without building or sending anything.

## Rolling back

The server and the content ship together in one image, so rolling back Cloud Run is usually enough.

```sh
gcloud run revisions list --service=interview-prep-web --region=europe-west1 --account=avi6106@gmail.com --project=avi-interview-prep
gcloud run services update-traffic interview-prep-web --to-revisions=<revision>=100 --region=europe-west1 --account=avi6106@gmail.com --project=avi-interview-prep
```

Or redeploy an older image: list tags with `gcloud artifacts docker images list europe-west1-docker.pkg.dev/avi-interview-prep/interview-prep --include-tags --account=avi6106@gmail.com --project=avi-interview-prep` and run `gcloud run deploy interview-prep-web --image=<image:tag>` with the same flags.

The Hosting version only holds the rewrite, so it rarely needs a rollback. If it does, release an older version:

```sh
TOKEN=$(gcloud auth print-access-token --account=avi6106@gmail.com)
curl -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: avi-interview-prep" \
  https://firebasehosting.googleapis.com/v1beta1/sites/avi-interview-prep/releases
curl -X POST -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: avi-interview-prep" \
  "https://firebasehosting.googleapis.com/v1beta1/sites/avi-interview-prep/releases?versionName=sites/avi-interview-prep/versions/<id>"
```

## Costs and limits

- Cloud Run scales to zero and is capped at 3 instances of 1 CPU and 512 MiB, with 80 requests each and a 60 second timeout. Light use stays inside the free tier
- Firestore, Hosting and Auth with Google sign-in have free quotas far above what one learner uses
- Artifact Registry keeps every image. Storage past 0.5 GB costs a little each month, so delete old tags now and then
- Cloud Build gives 2500 free build minutes a month
- A [budget alert](https://console.cloud.google.com/billing/budgets) on the billing account is a good safety net
