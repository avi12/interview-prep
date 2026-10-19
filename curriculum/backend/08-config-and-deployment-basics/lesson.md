---
title: Config and deployment basics
lang: none
minutes: 20
level: junior
roles: [backend, ai]
sources:
  - https://12factor.net/config
  - https://12factor.net/build-release-run
  - https://12factor.net/disposability
  - https://12factor.net/logs
  - https://docs.docker.com/build/cache/
  - https://docs.docker.com/build/building/best-practices/
  - https://docs.docker.com/reference/dockerfile/
  - https://docs.docker.com/build/building/context/#dockerignore-files
  - https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/
  - https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
  - https://docs.github.com/en/actions/about-github-actions/understanding-github-actions
  - https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs
  - https://docs.npmjs.com/cli/v11/commands/npm-ci
  - https://adaface.com/blog/docker-interview-questions
---

## Config is not code

**Config** is whatever changes between deploys: the database URL, API keys, the port, a feature flag. **Code** is the same everywhere.

The twelve-factor rule: keep config in **environment variables**, outside the code. One build then runs anywhere.

Litmus test: could you open-source the repo right now without leaking a secret?

> **Why:** the same build moves from staging to production unchanged. Only its environment differs, so what you tested is what runs.

> **Not this:** `config.production.js` and `config.staging.js` in the repo. Secrets end up in git, and each new environment needs a code change.

```svg One build, three environments. Only the variables differ
<svg viewBox="0 0 520 210" role="img" aria-label="One build deployed to dev, staging and production with different variables">
  <g data-cue="build" font-family="var(--font-mono)" font-size="14">
    <rect x="20" y="62" width="130" height="68" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="3"/>
    <text x="85" y="92" text-anchor="middle" fill="var(--fg)">one build</text>
    <text x="85" y="112" text-anchor="middle" fill="var(--fg-muted)">same image</text>
  </g>
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="dev">
      <path d="M150 80 L230 36" stroke="var(--fg)" stroke-width="2"/>
      <rect x="230" y="14" width="270" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="240" y="40" fill="var(--fg)">dev   DATABASE_URL=localhost</text>
    </g>
    <g data-cue="staging">
      <path d="M150 96 L230 96" stroke="var(--fg)" stroke-width="2"/>
      <rect x="230" y="74" width="270" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="240" y="100" fill="var(--fg)">stage DATABASE_URL=stage-db</text>
    </g>
    <g data-cue="prod">
      <path d="M150 112 L230 156" stroke="var(--fg)" stroke-width="2"/>
      <rect x="230" y="134" width="270" height="44" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="240" y="160" fill="var(--fg)">prod  DATABASE_URL=prod-db</text>
    </g>
  </g>
</svg>
```

```narrate
[[build]] On the left, you build once. The result is a single image that never changes between environments. [[dev]] On a laptop, the environment points at a local database. [[staging]] In staging, the same variable points at the staging database. [[prod]] In production, it points at the real one. The code is identical everywhere, and only the environment changes.
```

## Environment variables in practice

- Read them **once, at startup**, in one place
- Parse them like any other input (lesson 2). Missing or wrong: **crash at once** with a clear message. Failing at boot beats failing on the first request that needs the value
- Locally use a `.env` file. Keep it in `.gitignore` and commit a `.env.example` with fake values
- Real secrets come from the platform's secret store, injected at run time

```ts
const env = z.object({ DATABASE_URL: z.url(), PORT: z.coerce.number().default(3000) }).parse(process.env);
```

> **Trap:** a secret written as `ENV` in a Dockerfile. Docker warns that the value stays in that layer and can be dumped, even if you unset it later. Pass secrets when the container **runs**.

```narrate
Read the environment once, when the program starts, and parse it like any other input. If a variable is missing or malformed, crash immediately with a clear message. That is far better than failing later on a customer's request. Keep a dot env file for local work, out of git. And never put a secret in the Dockerfile, because it stays in the image layers where anyone with the image can read it.
```

```quiz
q: Where should DATABASE_PASSWORD come from in production?
options:
  - An ENV line in the Dockerfile
  - Injected at run time from the platform's secret store
  - A constant in the code, used when NODE_ENV is production
answer: 1
why: Anything written into the image or the repo is readable by whoever gets it. A run-time secret stays out of both.
```

## Image, container, layers

An **image** is a read-only package: your code, its dependencies, and how to start. A **container** is a running instance of an image, an isolated process. One image can run as many containers as you like.

Images are built from **layers**, one per Dockerfile instruction. Docker caches each layer. When a layer changes, **it and every layer after it** are rebuilt.

Files written inside a running container are not part of the image. Data you need to keep belongs in a volume or a database.

```svg Editing the source invalidates its layer and everything after it. The layers below stay cached
<svg viewBox="0 0 520 200" role="img" aria-label="Stack of image layers, cached below the changed one">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="stable">
      <rect x="20" y="150" width="230" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="170" fill="var(--fg)">FROM node</text>
      <rect x="20" y="118" width="230" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="138" fill="var(--fg)">COPY package files</text>
      <rect x="20" y="86" width="230" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="30" y="106" fill="var(--fg)">RUN npm ci</text>
      <text x="270" y="130" fill="var(--ok)">cached, reused</text>
    </g>
    <g data-cue="changed">
      <rect x="20" y="54" width="230" height="30" fill="var(--surface-3)" stroke="var(--accent-2)" stroke-width="3"/>
      <text x="30" y="74" fill="var(--fg)">COPY . .</text>
      <text x="270" y="74" fill="var(--accent-2)">source edited</text>
    </g>
    <g data-cue="rebuilt">
      <rect x="20" y="22" width="230" height="30" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="2"/>
      <text x="30" y="42" fill="var(--fg)">CMD</text>
      <text x="270" y="42" fill="var(--primary)">rebuilt too</text>
    </g>
  </g>
</svg>
```

```narrate
Picture the layers as a stack, built from the bottom. [[stable]] The base image, the package files and the install step rarely change, so Docker reuses them from its cache. [[changed]] When you edit your source code, the layer that copies it is invalid. [[rebuilt]] That layer and everything above it are built again. Order matters: put what changes least at the bottom.
```

## A Dockerfile interviewers like

```dockerfile
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
USER node
CMD ["node", "server.js"]
```

| Habit | Because |
|---|---|
| copy package files, install, **then** copy source | edits skip the slow install |
| `.dockerignore` for `node_modules`, `.git`, `.env` | smaller context, no secrets copied in |
| pin the base image tag | the same build tomorrow |
| `USER node`, not root | a break-in gets fewer powers |
| exec form `CMD [...]` | the app receives SIGTERM and can stop cleanly |

> **Not this:** `COPY . .` before `npm ci`. Every source edit then reinstalls all dependencies.

```narrate
Here is the shape to remember. Copy only the package files, install, and then copy the rest. Because of the cache, a code edit skips the slow install. Add a dot docker ignore so node modules, git history and secret files never enter the build. Pin the base image, run as a normal user, and use the array form of the command, so the app receives the stop signal and can shut down cleanly.
```

```quiz
q: You change one source file and rebuild the Dockerfile above. What runs again?
options:
  - Every step, from FROM
  - COPY . . and the steps after it
  - Only CMD
answer: 1
why: The base, package copy and install layers are unchanged, so they come from the cache. The first changed layer, COPY . ., and everything after it are rebuilt.
```

## Health checks and clean shutdown

The platform needs to ask your app two different questions.

- **Liveness**, `/healthz`: "are you alive, not stuck?" Cheap. A failure means **restart** it
- **Readiness**, `/readyz`: "can you serve right now?" Database reachable, warmed up. A failure means **stop sending traffic**, no restart

Docker's `HEALTHCHECK` runs a command and marks the container `healthy` or `unhealthy` (exit code 0 or 1).

On `SIGTERM`: stop taking new requests, finish the current ones, exit.

> **Trap:** a liveness check that queries the database. When the database blips, every instance fails the check and restarts in a loop. Kubernetes docs warn about cascading failures.

```svg Two probes, two different reactions
<svg viewBox="0 0 520 200" role="img" aria-label="Liveness and readiness probes and their outcomes">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="platform">
      <rect x="20" y="62" width="120" height="70" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="80" y="92" text-anchor="middle" fill="var(--fg)">platform</text>
      <text x="80" y="112" text-anchor="middle" fill="var(--fg-muted)">probes</text>
    </g>
    <g data-cue="live">
      <path d="M140 80 L200 40" stroke="var(--fg)" stroke-width="2"/>
      <rect x="200" y="20" width="140" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="270" y="45" text-anchor="middle" fill="var(--fg)">/healthz</text>
      <text x="350" y="45" fill="var(--danger)">fails: restart</text>
    </g>
    <g data-cue="ready">
      <path d="M140 114 L200 154" stroke="var(--fg)" stroke-width="2"/>
      <rect x="200" y="134" width="140" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="270" y="159" text-anchor="middle" fill="var(--fg)">/readyz</text>
      <text x="350" y="159" fill="var(--accent-2)">fails: no traffic</text>
    </g>
  </g>
</svg>
```

```narrate
[[platform]] The platform keeps asking your app questions. [[live]] The first is, are you alive? If this fails, the platform restarts the process, so keep it cheap and never make it depend on the database. [[ready]] The second is, can you serve right now? If this fails, the platform simply stops sending traffic until you recover. No restart.
```

## Logs

Write logs to **stdout**, one event per line. The platform collects them. Twelve-factor: the app "never concerns itself with routing or storage of its output stream."

Use **structured** lines, so tools can filter:

```json
{"level":"error","time":"2026-10-19T09:30:00Z","requestId":"r-481","msg":"payment failed","status":502}
```

- A `requestId` lets you follow one request through many services
- Levels: `error` needs a human, `warn` is odd but handled, `info` is the story, `debug` is for digging
- Never log passwords, tokens or full card numbers

> **Not this:** the app writing its own log files and rotating them. Files die with the container and fill the disk.

```narrate
Print logs to standard output, one line per event, and let the platform gather them. Make each line structured, with a level, a time, a message, and a request identifier, so one request can be followed across many services. And be careful what goes in: never log passwords, tokens, or full card numbers.
```

## CI/CD in one picture

**CI** runs checks on every push, so a broken change is caught before it merges. **CD** ships a build that passed. Cheap checks first, so failures come fast.

Build the image **once** and promote that same image. Twelve-factor: a release is immutable, so a rollback means deploying the previous release.

In GitHub Actions: an **event** triggers a **workflow** (YAML in `.github/workflows`), made of **jobs**, each running **steps** on a **runner**.

```svg Any failing stage stops the line. Only a passing build reaches deploy
<svg viewBox="0 0 520 170" role="img" aria-label="Pipeline stages from push to deploy">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="push">
      <rect x="10" y="40" width="80" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="50" y="65" text-anchor="middle" fill="var(--fg)">push</text>
    </g>
    <g data-cue="checks">
      <path d="M90 60 L110 60" stroke="var(--fg)" stroke-width="2"/>
      <rect x="110" y="40" width="80" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="150" y="65" text-anchor="middle" fill="var(--fg)">install</text>
      <path d="M190 60 L210 60" stroke="var(--fg)" stroke-width="2"/>
      <rect x="210" y="40" width="80" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="250" y="65" text-anchor="middle" fill="var(--fg)">lint</text>
      <path d="M290 60 L310 60" stroke="var(--fg)" stroke-width="2"/>
      <rect x="310" y="40" width="80" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="350" y="65" text-anchor="middle" fill="var(--fg)">test</text>
      <path d="M250 80 L250 120" stroke="var(--danger)" stroke-width="2"/>
      <text x="262" y="124" fill="var(--danger)">fail: stop here</text>
    </g>
    <g data-cue="ship">
      <path d="M390 60 L410 60" stroke="var(--ok)" stroke-width="2"/>
      <rect x="410" y="40" width="100" height="40" fill="var(--surface-3)" stroke="var(--ok)" stroke-width="2"/>
      <text x="460" y="65" text-anchor="middle" fill="var(--fg)">build, deploy</text>
    </g>
  </g>
</svg>
```

```narrate
[[push]] It starts with a push or a pull request. [[checks]] The pipeline installs dependencies, runs the linter, then the tests. If any stage fails, the line stops there and nothing ships. [[ship]] Only when everything passes does it build the image, once, and deploy that exact image. What reached production is what was tested.
```

```yaml
name: ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: '24.x'
      - run: npm ci
      - run: npm test
```

> **Why:** `npm ci` installs exactly what the lockfile says, so CI matches your laptop.

> **Not this:** SSH into the server and `git pull`. The code that runs was never built or tested the way you ship it.

## Say it in the interview

Junior question lists keep returning to the same few topics. Answer in one sentence, then offer the reason.

| They ask | You say |
|---|---|
| Image vs container? | An image is the read-only package. A container is a running instance of it |
| What is a Dockerfile? | The recipe that builds an image, one layer per instruction |
| How do you pass config? | Environment variables at run time, validated at startup. Secrets from the platform, never in the image |
| Why is the rebuild slow? | A changed layer rebuilds everything after it. Install dependencies before copying source |
| Does `EXPOSE` open a port? | No, it documents it. Publish with `-p` |
| How do you see logs? | They go to stdout. `docker logs`, and in production the platform collects them |
| How do you know it is healthy? | Liveness and readiness endpoints, or `HEALTHCHECK` |
| What does your CI do? | Install, lint, test, build the image once, deploy it |

```narrate
These are the questions junior lists keep asking. Answer each in one sentence, then add the reason. An image is the package, a container is a running copy. Config comes from environment variables, validated at startup, with secrets injected at run time. Slow rebuilds mean a bad layer order. Expose only documents a port. And your pipeline installs, lints, tests, builds once, and deploys that build.
```

```quiz
q: A Dockerfile says EXPOSE 3000. You run the container with no -p flag. Can your browser reach localhost:3000?
options:
  - Yes, EXPOSE opens the port
  - No, EXPOSE only documents it. Publish it with -p
  - Yes, but only on Linux
answer: 1
why: Docker's reference says EXPOSE does not actually publish the port. You publish with -p at docker run.
```
