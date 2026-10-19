PAIRS = {")": "(", "]": "[", "}": "{"}


def is_valid(text):
    stack = []
    for char in text:
        if char not in PAIRS:
            stack.append(char)
            continue
        if not stack or stack.pop() != PAIRS[char]:
            return False
    return not stack
