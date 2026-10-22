import { fileURLToPath } from "node:url";

export const SCRIPTS_ALIAS = { "@scripts": fileURLToPath(new URL("../../scripts", import.meta.url)) };
