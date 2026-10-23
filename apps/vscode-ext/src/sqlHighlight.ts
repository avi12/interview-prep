import { SQL_SELECTOR, type SqlTablesOfDocument } from "@/sqlCompletion.ts";
import type { SqlTable } from "@scripts/lib/schema.ts";
import * as vscode from "vscode";

const TokenType = {
  column: "property",
  table: "type"
} as const;
const LEGEND = new vscode.SemanticTokensLegend([TokenType.column, TokenType.table]);
const TOKEN_INDEX = {
  [TokenType.column]: 0,
  [TokenType.table]: 1
};
const WORD = /\w+/g;
const QUOTE = "'";
const LINE_COMMENT = "--";
const NO_MODIFIERS = 0;

function namesByKind(tables: SqlTable[]) {
  const kinds = new Map<string, keyof typeof TOKEN_INDEX>();
  for (const table of tables) {
    for (const column of table.columns) {
      kinds.set(column.name.toLowerCase(), TokenType.column);
    }
  }

  for (const table of tables) {
    kinds.set(table.name.toLowerCase(), TokenType.table);
  }

  return kinds;
}

function blankStringsAndComments(line: string) {
  let isInString = false;
  let code = "";
  for (let index = 0; index < line.length; index++) {
    const character = line[index];
    if (!isInString && line.startsWith(LINE_COMMENT, index)) {
      return code.padEnd(line.length);
    }

    if (character === QUOTE) {
      isInString = !isInString;
    }

    code += isInString || character === QUOTE ? " " : character;
  }
  return code;
}

export function registerSqlHighlight(tablesOfDocument: SqlTablesOfDocument) {
  return vscode.languages.registerDocumentSemanticTokensProvider(
    SQL_SELECTOR,
    {
      provideDocumentSemanticTokens(document) {
        const builder = new vscode.SemanticTokensBuilder(LEGEND);
        const kinds = namesByKind(tablesOfDocument(document));
        if (kinds.size === 0) {
          return builder.build();
        }

        for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
          const code = blankStringsAndComments(document.lineAt(lineNumber).text);
          for (const match of code.matchAll(WORD)) {
            const kind = kinds.get(match[0].toLowerCase());
            if (kind) {
              builder.push(lineNumber, match.index, match[0].length, TOKEN_INDEX[kind], NO_MODIFIERS);
            }
          }
        }
        return builder.build();
      }
    },
    LEGEND
  );
}
