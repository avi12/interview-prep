import { defineBackground } from "#imports";
import { installLive } from "@/lib/live.ts";

export default defineBackground(() => {
  installLive();
});
