import { runnerUrl } from "@/lib/web-paths.ts";

export function engineUrl(path: string) {
  return new URL(runnerUrl(path), self.location.href);
}
