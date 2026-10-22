import { type TutorBlock, TutorBlockKind } from "@scripts/lib/tutor-view.ts";

const WireType = {
  VARINT: 0,
  BYTES: 2
} as const;

const ContentAttributeType = {
  ROOT: 1,
  PARAGRAPH: 4,
  HEADING: 5,
  TEXT: 20
} as const;

const AnnotatedPageContentField = {
  VERSION: 1,
  ROOT_NODE: 2,
  MAIN_FRAME_DATA: 3
} as const;
const ContentNodeField = {
  CHILDREN: 1,
  ATTRIBUTES: 2
} as const;
const ContentAttributesField = {
  DOM_NODE_ID: 2,
  TYPE: 3,
  TEXT_DATA: 10
} as const;
const TextInfoField = { TEXT_CONTENT: 1 } as const;
const FrameDataField = {
  URL: 4,
  TITLE: 5
} as const;
const APC_VERSION_1_0 = 1;
const VARINT_CONTINUE = 0x80;
const VARINT_LOW_BITS = 0x7f;
const TAG_WIRE_TYPE_BITS = 3;

const encoder = new TextEncoder();

function varint(value: number) {
  const bytes: number[] = [];
  let rest = value;
  while (rest >= VARINT_CONTINUE) {
    bytes.push((rest & VARINT_LOW_BITS) | VARINT_CONTINUE);
    rest = Math.floor(rest / VARINT_CONTINUE);
  }
  bytes.push(rest);
  return bytes;
}

function tag({ field, wireType }: {
  field: number;
  wireType: number;
}) {
  return varint((field << TAG_WIRE_TYPE_BITS) | wireType);
}

function varintField({ field, value }: {
  field: number;
  value: number;
}) {
  return [...tag({
    field,
    wireType: WireType.VARINT
  }), ...varint(value)];
}

function bytesField({ field, bytes }: {
  field: number;
  bytes: ArrayLike<number>;
}) {
  return [...tag({
    field,
    wireType: WireType.BYTES
  }), ...varint(bytes.length), ...Array.from(bytes)];
}

function stringField({ field, text }: {
  field: number;
  text: string;
}) {
  return bytesField({
    field,
    bytes: encoder.encode(text)
  });
}

function contentNode({ type, id, text, children = [] }: {
  type: number;
  id: number;
  text?: string;
  children?: number[][];
}) {
  const attributes = [
    ...varintField({
      field: ContentAttributesField.DOM_NODE_ID,
      value: id
    }),
    ...varintField({
      field: ContentAttributesField.TYPE,
      value: type
    }),
    ...(text === undefined ? [] : bytesField({
      field: ContentAttributesField.TEXT_DATA,
      bytes: stringField({
        field: TextInfoField.TEXT_CONTENT,
        text
      })
    }))
  ];
  return [...children.flatMap(child => bytesField({
    field: ContentNodeField.CHILDREN,
    bytes: child
  })), ...bytesField({
    field: ContentNodeField.ATTRIBUTES,
    bytes: attributes
  })];
}

const BLOCK_TYPE: Record<TutorBlockKind, number> = {
  [TutorBlockKind.HEADING]: ContentAttributeType.HEADING,
  [TutorBlockKind.PARAGRAPH]: ContentAttributeType.PARAGRAPH
};

export function annotatedPageContent({ title, url, blocks }: {
  title: string;
  url: string;
  blocks: TutorBlock[];
}) {
  let nextId = 1;
  const children = blocks.map(({ kind, text }) => {
    const blockId = ++nextId;
    const textNode = contentNode({
      type: ContentAttributeType.TEXT,
      id: ++nextId,
      text
    });
    return contentNode({
      type: BLOCK_TYPE[kind],
      id: blockId,
      children: [textNode]
    });
  });
  const root = contentNode({
    type: ContentAttributeType.ROOT,
    id: 1,
    children
  });
  const frame = [...stringField({
    field: FrameDataField.URL,
    text: url
  }), ...stringField({
    field: FrameDataField.TITLE,
    text: title
  })];
  return new Uint8Array([
    ...varintField({
      field: AnnotatedPageContentField.VERSION,
      value: APC_VERSION_1_0
    }),
    ...bytesField({
      field: AnnotatedPageContentField.ROOT_NODE,
      bytes: root
    }),
    ...bytesField({
      field: AnnotatedPageContentField.MAIN_FRAME_DATA,
      bytes: frame
    })
  ]);
}

export function byteStream(bytes: Uint8Array) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
}
