import re

import numpy as np

VOCABULARY = [
    "cat", "kitten", "dog", "puppy", "pet", "fetch", "walk", "leash", "bark", "purr",
    "bread", "sourdough", "starter", "flour", "oven", "bake", "yeast", "dough", "feed", "knead",
    "python", "code", "function", "bug", "test", "loop", "list", "vector", "array", "debug",
    "flight", "airport", "ticket", "passport", "hotel", "train", "luggage", "visa",
    "rain", "sun", "wind", "cloud", "storm", "snow",
    "twice", "daily", "hours", "minutes", "water", "salt",
]

WORD_PATTERN = re.compile(r"[a-z]+")
INDEX_OF_WORD = {word: index for index, word in enumerate(VOCABULARY)}
DIMENSIONS = len(VOCABULARY)


def tokenize(text):
    return WORD_PATTERN.findall(text.lower())


def embed(text):
    vector = np.zeros(DIMENSIONS)
    for word in tokenize(text):
        index = INDEX_OF_WORD.get(word)
        if index is not None:
            vector[index] += 1
    return vector


def embed_many(texts):
    if not texts:
        return np.zeros((0, DIMENSIONS))
    return np.array([embed(text) for text in texts])
