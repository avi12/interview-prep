import { Command, IS_LOCAL_CONTEXT_KEY, LOCAL_ONLY_COMMANDS, VoiceCommand } from "@/contributions.ts";
import { WEB_EXTENSION_MANIFEST } from "@/webManifest.ts";
import packageJson from "@manifest" with { type: "json" };
import { describe, expect, it } from "vitest";

const { commands, menus } = packageJson.contributes;
const LOCAL_ONLY = new Set<string>(LOCAL_ONLY_COMMANDS);

function isLocalOnlyClause(when: string | undefined) {
  return when?.split("&&").some(clause => clause.trim() === IS_LOCAL_CONTEXT_KEY) ?? false;
}

describe("manifest contributions", () => {
  it("declares every command the extension registers", () => {
    const declared = new Set(commands.map(({ command }) => command));
    for (const command of [...Object.values(Command), ...Object.values(VoiceCommand)]) {
      expect(declared).toContain(command);
    }
  });

  it("hides each local-only command from the command palette on the web", () => {
    for (const command of LOCAL_ONLY_COMMANDS) {
      const entry = menus.commandPalette.find(candidate => candidate.command === command);
      expect(isLocalOnlyClause(entry?.when)).toBe(true);
    }
  });

  it("shows local-only commands in menus only when local", () => {
    const menuEntries = [...menus["view/title"], ...menus["editor/title"]];
    for (const { command, when } of menuEntries.filter(entry => LOCAL_ONLY.has(entry.command))) {
      expect({
        command,
        isLocalOnly: isLocalOnlyClause(when)
      }).toEqual({
        command,
        isLocalOnly: true
      });
    }
  });

  it("gives the web the same contributions with no Node entry point", () => {
    expect(WEB_EXTENSION_MANIFEST.contributes).toBe(packageJson.contributes);
    expect(WEB_EXTENSION_MANIFEST).not.toHaveProperty("main");
  });
});
