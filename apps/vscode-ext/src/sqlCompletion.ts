import type { LessonEntry } from "@/lessonData.ts";
import * as vscode from "vscode";

type SqlTable = LessonEntry["sqlTables"][number];

const SQL_SELECTOR: vscode.DocumentSelector = {
  language: "sql",
  scheme: "file"
};
const QUALIFIER_TRIGGER = ".";

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "OFFSET", "AS", "DISTINCT",
  "JOIN", "INNER JOIN", "LEFT JOIN", "ON", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE", "ILIKE",
  "IS NULL", "IS NOT NULL", "ASC", "DESC", "CASE", "WHEN", "THEN", "ELSE", "END", "WITH", "UNION",
  "COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "COALESCE", "OVER", "PARTITION BY",
  "ROW_NUMBER", "RANK", "DENSE_RANK", "LAG", "LEAD", "CREATE INDEX", "EXPLAIN"
];

const SortGroup = {
  column: "0",
  table: "1",
  keyword: "2"
} as const;

const TABLE_REFERENCE = /\b(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
const CLAUSE_WORDS = new Set(["on", "where", "join", "left", "right", "inner", "full", "cross", "group", "order", "limit", "having", "using"]);
const QUALIFIED_PREFIX = /(\w+)\.\w*$/;

function aliasesIn({ text, tables }: {
  text: string;
  tables: SqlTable[];
}) {
  const byName = new Map(tables.map(table => [table.name.toLowerCase(), table]));
  const aliases = new Map(byName);
  for (const [, name, alias] of text.matchAll(TABLE_REFERENCE)) {
    const table = byName.get(name.toLowerCase());
    if (table && alias && !CLAUSE_WORDS.has(alias.toLowerCase())) {
      aliases.set(alias.toLowerCase(), table);
    }
  }
  return aliases;
}

function referencedTables({ text, tables }: {
  text: string;
  tables: SqlTable[];
}) {
  const names = new Set([...text.matchAll(TABLE_REFERENCE)].map(([, name]) => name.toLowerCase()));
  const referenced = tables.filter(table => names.has(table.name.toLowerCase()));
  return referenced.length > 0 ? referenced : tables;
}

function columnItems(tables: SqlTable[]) {
  return tables.flatMap(table =>
    table.columns.map(column => {
      const item = new vscode.CompletionItem({
        label: column.name,
        description: `${table.name} · ${column.type}`
      }, vscode.CompletionItemKind.Field);
      item.sortText = `${SortGroup.column}${column.name}`;
      return item;
    }));
}

function tableItems(tables: SqlTable[]) {
  return tables.map(table => {
    const item = new vscode.CompletionItem({
      label: table.name,
      description: "table"
    }, vscode.CompletionItemKind.Class);
    item.detail = table.columns.map(column => column.name).join(", ");
    item.sortText = `${SortGroup.table}${table.name}`;
    return item;
  });
}

function keywordItems() {
  return SQL_KEYWORDS.map(keyword => {
    const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
    item.sortText = `${SortGroup.keyword}${keyword}`;
    return item;
  });
}

export function registerSqlCompletion(tablesOfDocument: (document: vscode.TextDocument) => SqlTable[]) {
  return vscode.languages.registerCompletionItemProvider(
    SQL_SELECTOR,
    {
      provideCompletionItems(document, position) {
        const tables = tablesOfDocument(document);
        const text = document.getText();
        const before = document.lineAt(position).text.slice(0, position.character);
        const qualifier = QUALIFIED_PREFIX.exec(before)?.[1];
        if (qualifier) {
          const table = aliasesIn({
            text,
            tables
          }).get(qualifier.toLowerCase());
          return table ? columnItems([table]) : [];
        }

        return [...columnItems(
          referencedTables({
            text,
            tables
          })
        ), ...tableItems(tables), ...keywordItems()];
      }
    },
    QUALIFIER_TRIGGER
  );
}
