METRIC_NAMES = ("hit_rate", "precision", "recall", "mrr")


def _hits_in_top_k(*, retrieved, relevant, k):
    return len(set(retrieved[:k]) & set(relevant))


def _mean(values):
    return sum(values) / len(values) if values else 0.0


def hit_at_k(*, retrieved, relevant, k):
    return 1.0 if _hits_in_top_k(retrieved=retrieved, relevant=relevant, k=k) > 0 else 0.0


def precision_at_k(*, retrieved, relevant, k):
    return _hits_in_top_k(retrieved=retrieved, relevant=relevant, k=k) / k


def recall_at_k(*, retrieved, relevant, k):
    relevant_ids = set(relevant)
    if not relevant_ids:
        return 0.0
    return _hits_in_top_k(retrieved=retrieved, relevant=relevant_ids, k=k) / len(relevant_ids)


def reciprocal_rank(*, retrieved, relevant):
    relevant_ids = set(relevant)
    for rank, doc_id in enumerate(retrieved, start=1):
        if doc_id in relevant_ids:
            return 1 / rank
    return 0.0


def evaluate_retriever(*, retrieve, golden_set, k):
    scores = {name: [] for name in METRIC_NAMES}
    for item in golden_set:
        retrieved = retrieve(item["query"])[:k]
        relevant = item["relevant"]
        scores["hit_rate"].append(hit_at_k(retrieved=retrieved, relevant=relevant, k=k))
        scores["precision"].append(precision_at_k(retrieved=retrieved, relevant=relevant, k=k))
        scores["recall"].append(recall_at_k(retrieved=retrieved, relevant=relevant, k=k))
        scores["mrr"].append(reciprocal_rank(retrieved=retrieved, relevant=relevant))
    return {name: _mean(values) for name, values in scores.items()}
