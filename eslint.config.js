import { svelte } from "eslint-config-avi12/svelte";

export default svelte({ ignores: ["dist/", "work/", "vendor/", ".vscode-server/", "apps/web/dist-client/", "apps/web/dist-server/", "apps/vscode-ext/dist/", "curriculum/*/[0-9]*/**"] });
