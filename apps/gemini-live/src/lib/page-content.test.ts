import { describe, expect, it } from "vitest";
import { TutorBlockKind } from "@scripts/lib/tutor-view.ts";
import { annotatedPageContent } from "./page-content.ts";

type Fields = Map<number, (number | Uint8Array)[]>;

const readVarint = ({ bytes, offset }: { bytes: Uint8Array; offset: number }) => {
  let value = 0;
  let scale = 1;
  let position = offset;
  for (;;) {
    const byte = bytes[position++] ?? 0;
    value += (byte & 0x7f) * scale;
    scale *= 0x80;
    if (byte < 0x80) return { value, next: position };
  }
};

const decode = (bytes: Uint8Array): Fields => {
  const fields: Fields = new Map();
  let offset = 0;
  while (offset < bytes.length) {
    const key = readVarint({ bytes, offset });
    const field = Math.floor(key.value / 8);
    const isBytes = key.value % 8 === 2;
    const head = readVarint({ bytes, offset: key.next });
    const value = isBytes ? bytes.subarray(head.next, head.next + head.value) : head.value;
    offset = isBytes ? head.next + head.value : head.next;
    fields.set(field, [...(fields.get(field) ?? []), value]);
  }
  return fields;
};

const bytesOf = ({ fields, field }: { fields: Fields; field: number }) => fields.get(field) as Uint8Array[];
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("annotatedPageContent", () => {
  const page = decode(
    annotatedPageContent({
      title: "GROUP BY",
      url: "http://127.0.0.1:8765",
      blocks: [
        { kind: TutorBlockKind.HEADING, text: "Your turn" },
        { kind: TutorBlockKind.PARAGRAPH, text: "at least 2 people" }
      ]
    })
  );

  it("is version 1 with the title and address in the main frame", () => {
    expect(page.get(1)).toEqual([1]);
    const [frame] = bytesOf({ fields: page, field: 3 }).map(decode);
    expect(text(bytesOf({ fields: frame!, field: 5 })[0]!)).toBe("GROUP BY");
    expect(text(bytesOf({ fields: frame!, field: 4 })[0]!)).toBe("http://127.0.0.1:8765");
  });

  it("nests each block under the root as a heading or paragraph holding one text node", () => {
    const [root] = bytesOf({ fields: page, field: 2 }).map(decode);
    const rootAttributes = decode(bytesOf({ fields: root!, field: 2 })[0]!);
    expect(rootAttributes.get(3)).toEqual([1]);
    const blocks = bytesOf({ fields: root!, field: 1 }).map(decode);
    const shapes = blocks.map(block => {
      const type = decode(bytesOf({ fields: block, field: 2 })[0]!).get(3)?.[0];
      const leaf = decode(bytesOf({ fields: block, field: 1 })[0]!);
      const leafAttributes = decode(bytesOf({ fields: leaf, field: 2 })[0]!);
      const textInfo = decode(bytesOf({ fields: leafAttributes, field: 10 })[0]!);
      return { type, leafType: leafAttributes.get(3)?.[0], text: text(bytesOf({ fields: textInfo, field: 1 })[0]!) };
    });
    expect(shapes).toEqual([
      { type: 5, leafType: 20, text: "Your turn" },
      { type: 4, leafType: 20, text: "at least 2 people" }
    ]);
  });
});
