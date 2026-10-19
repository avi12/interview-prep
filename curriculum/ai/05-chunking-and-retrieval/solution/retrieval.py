import numpy as np


def chunk_text(text, size, overlap):
    if size < 1:
        raise ValueError("size must be at least 1")
    if not 0 <= overlap < size:
        raise ValueError("overlap must be 0 or more, and smaller than size")
    words = text.split()
    if not words:
        return []
    last_start = max(len(words) - overlap, 1)
    return [" ".join(words[start:start + size]) for start in range(0, last_start, size - overlap)]


def retrieve(query, chunks, embed, k=3):
    if k <= 0 or not chunks:
        return []
    matrix = np.array([embed(chunk) for chunk in chunks], dtype=float)
    query_vector = np.asarray(embed(query), dtype=float)
    length_products = np.linalg.norm(matrix, axis=1) * np.linalg.norm(query_vector)
    dot_products = matrix @ query_vector
    scores = np.divide(dot_products, length_products, out=np.zeros_like(dot_products), where=length_products != 0)
    best_first = np.argsort(-scores, kind="stable")[:k]
    return [chunks[index] for index in best_first if scores[index] > 0]
