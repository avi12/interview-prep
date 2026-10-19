import numpy as np


def cosine_similarity(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    length_product = np.linalg.norm(a) * np.linalg.norm(b)
    if length_product == 0:
        return 0.0
    return float(np.dot(a, b) / length_product)


def top_k_similar(query, matrix, k):
    if k <= 0:
        return []
    query = np.asarray(query, dtype=float)
    matrix = np.asarray(matrix, dtype=float)
    length_products = np.linalg.norm(matrix, axis=1) * np.linalg.norm(query)
    dot_products = matrix @ query
    scores = np.divide(dot_products, length_products, out=np.zeros_like(dot_products), where=length_products != 0)
    best_first = np.argsort(-scores, kind="stable")[:k]
    return [(int(index), float(scores[index])) for index in best_first]
