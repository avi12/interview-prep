import { GCLOUD_ACCOUNT } from "#scripts/lib/gcloud.ts";
import { GCP } from "#scripts/lib/gcp.ts";

const OUTCOME = {
  DONE: "done",
  SKIPPED: "skipped",
  MANUAL: "manual step needed"
} as const;

type OutcomeKind = (typeof OUTCOME)[keyof typeof OUTCOME];

export interface Outcome {
  kind: OutcomeKind;
  detail: string;
}

export interface Step {
  label: string;
  plan: () => string[];
  run: () => Promise<Outcome>;
}

export function done(detail: string) {
  return {
    kind: OUTCOME.DONE,
    detail
  };
}

export function skipped(detail: string) {
  return {
    kind: OUTCOME.SKIPPED,
    detail
  };
}

export function manual(detail: string) {
  return {
    kind: OUTCOME.MANUAL,
    detail
  };
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function printDryRun(steps: Step[]) {
  for (const [iStep, step] of steps.entries()) {
    console.log(`[${iStep + 1}/${steps.length}] ${step.label}`);
    for (const line of step.plan()) {
      console.log(`    ${line}`);
    }
  }
}

export async function runSteps({ title, steps, isDryRun }: { title: string; steps: Step[]; isDryRun: boolean }) {
  console.log(
    `${title} - project ${GCP.projectId}, account ${GCLOUD_ACCOUNT}${isDryRun ? " (dry run, nothing is sent)" : ""}`
  );

  if (isDryRun) {
    printDryRun(steps);
    return [];
  }

  const manualSteps: Outcome[] = [];
  for (const [iStep, step] of steps.entries()) {
    const prefix = `[${iStep + 1}/${steps.length}] ${step.label}`;
    console.log(`${prefix} ...`);
    try {
      const outcome = await step.run();
      console.log(`${prefix}: ${outcome.kind} - ${outcome.detail}`);

      if (outcome.kind === OUTCOME.MANUAL) {
        manualSteps.push(outcome);
      }
    } catch (error) {
      console.error(`${prefix}: FAILED\n  ${errorText(error)}`);
      process.exit(1);
    }
  }

  return manualSteps;
}
