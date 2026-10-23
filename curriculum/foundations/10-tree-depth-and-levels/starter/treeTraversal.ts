export class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;

  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

export function maxDepth(_root: TreeNode | null): number {
  return 0;
}

export function levelOrder(_root: TreeNode | null): number[][] {
  return [];
}
