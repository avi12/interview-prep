import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { measureMs } from "#kit/timing.ts";

type Node = { val: number; left: Node | null; right: Node | null };
type Module = {
  TreeNode: new (val?: number, left?: Node | null, right?: Node | null) => Node;
  maxDepth: (root: Node | null) => number;
  levelOrder: (root: Node | null) => number[][];
};

const { TreeNode, maxDepth, levelOrder } = await loadImpl<Module>({ testUrl: import.meta.url, file: "treeTraversal.ts" });

const CHAIN_LENGTH = 3000;
const COMPLETE_TREE_LEVELS = 16;
const TIME_LIMIT_MS = 2000;
const GUARDED_CHAIN_LENGTH = 25;
const READS_PER_NODE_LIMIT = 10;

const nodeOrNull = (value: number | null | undefined) => (value === null || value === undefined ? null : new TreeNode(value));

const treeFromLevels = (values: (number | null)[]) => {
  const root = nodeOrNull(values[0]);
  if (root === null) return null;
  const parents = [root];
  let cursor = 1;
  for (const parent of parents) {
    parent.left = nodeOrNull(values[cursor]);
    parent.right = nodeOrNull(values[cursor + 1]);
    cursor += 2;
    if (parent.left) parents.push(parent.left);
    if (parent.right) parents.push(parent.right);
  }
  return root;
};

const guardedChain = ({ length, side }: { length: number; side: "left" | "right" }) => {
  const budget = { reads: 0, limit: length * READS_PER_NODE_LIMIT };
  const read = (child: Node | null) => {
    budget.reads++;
    if (budget.reads > budget.limit) {
      throw new Error(`The ${side} children of a ${length} node chain were read ${budget.reads} times. Ask each child once and reuse the answer, do not call maxDepth twice for the same child`);
    }
    return child;
  };
  let root: Node | null = null;
  for (let value = length; value >= 1; value--) {
    const child = root;
    const node: Node = { val: value, left: null, right: null };
    Object.defineProperty(node, side, { get: () => read(child) });
    root = node;
  }
  return root;
};

const completeTreeValues = (levels: number) => Array.from({ length: 2 ** levels - 1 }, (_, i) => i + 1);

const completeTreeLevelOrder = (levels: number) =>
  Array.from({ length: levels }, (_, depth) => Array.from({ length: 2 ** depth }, (_, i) => 2 ** depth + i));

describe("maxDepth", () => {
  it("is 0 for an empty tree", () => {
    expect(maxDepth(null)).toBe(0);
  });

  it("is 1 for a single node", () => {
    expect(maxDepth(treeFromLevels([1]))).toBe(1);
  });

  it("counts the levels of the classic example", () => {
    expect(maxDepth(treeFromLevels([3, 9, 20, null, null, 15, 7]))).toBe(3);
  });

  it("follows the deeper side when the tree leans left", () => {
    expect(maxDepth(treeFromLevels([1, 2, null, 3, null, 4]))).toBe(4);
  });

  it("follows the deeper side when the tree leans right", () => {
    expect(maxDepth(treeFromLevels([1, null, 2, null, 3]))).toBe(3);
  });

  it("works on a chain of 3,000 nodes", () => {
    expect(maxDepth(guardedChain({ length: CHAIN_LENGTH, side: "left" }))).toBe(CHAIN_LENGTH);
  });

  it("asks each child once, so a long chain does not double the work at every node", () => {
    expect(maxDepth(guardedChain({ length: GUARDED_CHAIN_LENGTH, side: "left" }))).toBe(GUARDED_CHAIN_LENGTH);
    expect(maxDepth(guardedChain({ length: GUARDED_CHAIN_LENGTH, side: "right" }))).toBe(GUARDED_CHAIN_LENGTH);
  });

  it("works when the values are zero or negative", () => {
    expect(maxDepth(treeFromLevels([0, -1, 5, 0, null, null, -7]))).toBe(3);
  });

  it("stays fast on a complete tree of 65,535 nodes", () => {
    const root = treeFromLevels(completeTreeValues(COMPLETE_TREE_LEVELS));
    const { result: depth, elapsedMs } = measureMs(() => maxDepth(root));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(depth).toBe(COMPLETE_TREE_LEVELS);
  });
});

describe("levelOrder", () => {
  it("is empty for an empty tree", () => {
    expect(levelOrder(null)).toEqual([]);
  });

  it("is one level for a single node", () => {
    expect(levelOrder(treeFromLevels([1]))).toEqual([[1]]);
  });

  it("groups the classic example by level", () => {
    expect(levelOrder(treeFromLevels([3, 9, 20, null, null, 15, 7]))).toEqual([[3], [9, 20], [15, 7]]);
  });

  it("reads each level from left to right", () => {
    expect(levelOrder(treeFromLevels([1, 2, 3, 4, null, null, 5]))).toEqual([[1], [2, 3], [4, 5]]);
  });

  it("gives one value per level on a chain", () => {
    expect(levelOrder(treeFromLevels([1, null, 2, null, 3]))).toEqual([[1], [2], [3]]);
  });

  it("keeps zero and negative values", () => {
    expect(levelOrder(treeFromLevels([0, -1, 5, 0, null, null, -7]))).toEqual([[0], [-1, 5], [0, -7]]);
  });

  it("does not change the tree it was given", () => {
    const root = treeFromLevels([3, 9, 20, null, null, 15, 7]);
    const before = JSON.stringify(root);
    levelOrder(root);
    maxDepth(root);
    expect(JSON.stringify(root)).toBe(before);
    expect(levelOrder(root)).toEqual([[3], [9, 20], [15, 7]]);
  });

  it("keeps levels apart on a complete tree of 65,535 nodes", () => {
    const root = treeFromLevels(completeTreeValues(COMPLETE_TREE_LEVELS));
    const { result: levels, elapsedMs } = measureMs(() => levelOrder(root));
    expect(elapsedMs).toBeLessThan(TIME_LIMIT_MS);
    expect(levels).toEqual(completeTreeLevelOrder(COMPLETE_TREE_LEVELS));
  });
});
