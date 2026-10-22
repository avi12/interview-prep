import { installLive } from "@/lib/live.ts";
import { defineBackground } from "#imports";

export default defineBackground(() => {
  installLive();
});
