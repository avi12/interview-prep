import { TutorBlockKind } from "@scripts/lib/tutor-view.ts";
import { describe, expect, it } from "vitest";

import { annotatedPageContent } from "./page-content.ts";

type Fields = Map<number, (number | Uint8Array)[]>;

function readVarint({ bytes, offset }: { bytes: Uint8Array; offset: number }) {
  let value = 0;
  let scale = 1;
  let position = offset;
  for (;;) {
    const byte = bytes[position++] ?? 0;
    value += (byte & 0x7f) * scale;
    scale *= 0x80;

    if (byte < 0x80) {
      return {
        value,
        next: position
      };
    }
  }
}

function decode(bytes: Uint8Array) {
  const fields: Fields = new Map();
  let offset = 0;
  while (offset < bytes.length) {
    const key = readVarint({
      bytes,
      offset
    });
    const field = Math.floor(key.value / 8);
    const isBytes = key.value % 8 === 2;
    const head = readVarint({
      bytes,
      offset: key.next
    });
    const value = isBytes ? bytes.subarray(head.next, head.next + head.value) : head.value;
    offset = isBytes ? head.next + head.value : head.next;
    fields.set(field, [...(fields.get(field) ?? []), value]);
  }
  return fields;
}

function bytesOf({ fields, field }: { fields: Fields; field: number }) {
  return (fields.get(field) ?? []).filter(value => value instanceof Uint8Array);
}

function text(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function firstBytesOf(options: Parameters<typeof bytesOf>[0]) {
  const [first] = bytesOf(options);
  if (!first) {
    throw new Error(`field ${options.field} has no bytes`);
  }

  return first;
}

describe("annotatedPageContent", () => {
  const page = decode(
    annotatedPageContent({
      title: "GROUP BY",
      url: "http://127.0.0.1:8765",
      blocks: [
        {
          kind: TutorBlockKind.HEADING,
          text: "Your turn"
        },
        {
          kind: TutorBlockKind.PARAGRAPH,
          text: "at least 2 people"
        }
      ]
    })
  );

  it("is version 1 with the title and address in the main frame", () => {
    expect(page.get(1)).toEqual([1]);
    const frame = firstBytesOf({
      fields: page,
      field: 3
    });
    const mainFrame = decode(frame);
    expect(
      text(
        firstBytesOf({
          fields: mainFrame,
          field: 5
        })
      )
    ).toBe("GROUP BY");
    expect(
      text(
        firstBytesOf({
          fields: mainFrame,
          field: 4
        })
      )
    ).toBe("http://127.0.0.1:8765");
  });

  it("nests each block under the root as a heading or paragraph holding one text node", () => {
    const root = decode(
      firstBytesOf({
        fields: page,
        field: 2
      })
    );
    const rootAttributes = decode(
      firstBytesOf({
        fields: root,
        field: 2
      })
    );
    expect(rootAttributes.get(3)).toEqual([1]);
    const blocks = bytesOf({
      fields: root,
      field: 1
    }).map(decode);
    const shapes = blocks.map(block => {
      const type = decode(
        firstBytesOf({
          fields: block,
          field: 2
        })
      ).get(3)?.[0];
      const leaf = decode(
        firstBytesOf({
          fields: block,
          field: 1
        })
      );
      const leafAttributes = decode(
        firstBytesOf({
          fields: leaf,
          field: 2
        })
      );
      const textInfo = decode(
        firstBytesOf({
          fields: leafAttributes,
          field: 10
        })
      );
      return {
        type,
        leafType: leafAttributes.get(3)?.[0],
        text: text(
          firstBytesOf({
            fields: textInfo,
            field: 1
          })
        )
      };
    });
    expect(shapes).toEqual([
      {
        type: 5,
        leafType: 20,
        text: "Your turn"
      },
      {
        type: 4,
        leafType: 20,
        text: "at least 2 people"
      }
    ]);
  });
});
