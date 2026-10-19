from collections import defaultdict


def anagram_key(word):
    return "".join(sorted(word))


def group_anagrams(words):
    groups = defaultdict(list)
    for word in words:
        groups[anagram_key(word)].append(word)
    return list(groups.values())
