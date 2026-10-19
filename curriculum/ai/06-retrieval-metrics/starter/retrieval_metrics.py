def hit_at_k(*, retrieved, relevant, k):
    return 0.0


def precision_at_k(*, retrieved, relevant, k):
    return 0.0


def recall_at_k(*, retrieved, relevant, k):
    return 0.0


def reciprocal_rank(*, retrieved, relevant):
    return 0.0


def evaluate_retriever(*, retrieve, golden_set, k):
    return {"hit_rate": 0.0, "precision": 0.0, "recall": 0.0, "mrr": 0.0}
