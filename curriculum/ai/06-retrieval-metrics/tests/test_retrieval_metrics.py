import pytest
from impl import load_impl

metrics = load_impl(__file__, "retrieval_metrics.py")
hit_at_k = metrics.hit_at_k
precision_at_k = metrics.precision_at_k
recall_at_k = metrics.recall_at_k
reciprocal_rank = metrics.reciprocal_rank
evaluate_retriever = metrics.evaluate_retriever

RETRIEVED = ["d9", "d2", "d4", "d7", "d1"]
RELEVANT = ["d2", "d7"]


def scripted_retriever(results):
    return lambda query: results[query]


def test_hit_is_one_when_a_relevant_passage_is_inside_the_cutoff():
    assert hit_at_k(retrieved=RETRIEVED, relevant=RELEVANT, k=3) == 1.0


def test_hit_is_zero_when_the_cutoff_ends_before_the_first_relevant_passage():
    assert hit_at_k(retrieved=RETRIEVED, relevant=RELEVANT, k=1) == 0.0


def test_precision_is_relevant_in_top_k_over_k():
    assert precision_at_k(retrieved=RETRIEVED, relevant=RELEVANT, k=3) == pytest.approx(1 / 3)
    assert precision_at_k(retrieved=RETRIEVED, relevant=RELEVANT, k=5) == pytest.approx(2 / 5)


def test_precision_divides_by_k_even_when_fewer_results_come_back():
    assert precision_at_k(retrieved=["d2"], relevant=RELEVANT, k=5) == pytest.approx(0.2)


def test_recall_is_relevant_in_top_k_over_all_relevant():
    assert recall_at_k(retrieved=RETRIEVED, relevant=RELEVANT, k=1) == 0.0
    assert recall_at_k(retrieved=RETRIEVED, relevant=RELEVANT, k=3) == pytest.approx(0.5)
    assert recall_at_k(retrieved=RETRIEVED, relevant=RELEVANT, k=5) == pytest.approx(1.0)


def test_recall_divides_by_all_relevant_not_by_k():
    assert recall_at_k(retrieved=["d2", "d9", "d4"], relevant=["d2", "d7", "d8", "d5"], k=3) == pytest.approx(0.25)


def test_a_repeated_id_counts_once_so_recall_never_passes_one():
    assert recall_at_k(retrieved=["d2", "d2", "d2"], relevant=RELEVANT, k=3) == pytest.approx(0.5)


def test_no_relevant_ids_gives_zero_instead_of_a_crash():
    assert recall_at_k(retrieved=RETRIEVED, relevant=[], k=3) == 0.0


def test_reciprocal_rank_is_one_over_the_rank_of_the_first_relevant_passage():
    assert reciprocal_rank(retrieved=RETRIEVED, relevant=RELEVANT) == pytest.approx(0.5)
    assert reciprocal_rank(retrieved=["d2", "d9"], relevant=RELEVANT) == pytest.approx(1.0)
    assert reciprocal_rank(retrieved=["d1", "d3", "d5", "d7"], relevant=RELEVANT) == pytest.approx(0.25)


def test_reciprocal_rank_is_zero_when_nothing_relevant_is_found():
    assert reciprocal_rank(retrieved=["d1", "d3"], relevant=RELEVANT) == 0.0


GOLDEN_A = [
    {"query": "refund window", "relevant": ["d2", "d7"]},
    {"query": "reset password", "relevant": ["d3"]},
    {"query": "shipping time", "relevant": ["d5"]},
]
RESULTS_A = {
    "refund window": ["d9", "d2", "d4", "d7", "d1"],
    "reset password": ["d3", "d8", "d6", "d1", "d2"],
    "shipping time": ["d1", "d2", "d4", "d6", "d5"],
}


def test_evaluate_averages_each_metric_over_the_golden_set():
    report = evaluate_retriever(retrieve=scripted_retriever(RESULTS_A), golden_set=GOLDEN_A, k=3)
    assert report["hit_rate"] == pytest.approx(2 / 3)
    assert report["precision"] == pytest.approx(2 / 9)
    assert report["recall"] == pytest.approx(0.5)
    assert report["mrr"] == pytest.approx(0.5)


def test_evaluate_only_grades_the_first_k_results():
    report = evaluate_retriever(retrieve=scripted_retriever(RESULTS_A), golden_set=[GOLDEN_A[2]], k=3)
    assert report == {"hit_rate": 0.0, "precision": 0.0, "recall": 0.0, "mrr": 0.0}


def test_evaluate_works_on_a_different_golden_set():
    golden = [
        {"query": "opening hours", "relevant": ["a", "b", "c"]},
        {"query": "parking", "relevant": ["z"]},
    ]
    results = {"opening hours": ["a", "x", "b", "c"], "parking": ["y", "z"]}
    report = evaluate_retriever(retrieve=scripted_retriever(results), golden_set=golden, k=2)
    assert report["hit_rate"] == pytest.approx(1.0)
    assert report["precision"] == pytest.approx(0.5)
    assert report["recall"] == pytest.approx(2 / 3)
    assert report["mrr"] == pytest.approx(0.75)


def test_same_passages_in_a_better_order_keep_recall_but_raise_mrr():
    golden = [{"query": "refund window", "relevant": ["d2"]}]
    good = scripted_retriever({"refund window": ["d2", "d9", "d4"]})
    bad = scripted_retriever({"refund window": ["d9", "d4", "d2"]})
    good_report = evaluate_retriever(retrieve=good, golden_set=golden, k=3)
    bad_report = evaluate_retriever(retrieve=bad, golden_set=golden, k=3)
    assert good_report["recall"] == bad_report["recall"] == pytest.approx(1.0)
    assert good_report["mrr"] == pytest.approx(1.0)
    assert bad_report["mrr"] == pytest.approx(1 / 3)


def test_evaluate_on_an_empty_golden_set_returns_zeros():
    report = evaluate_retriever(retrieve=scripted_retriever({}), golden_set=[], k=3)
    assert report == {"hit_rate": 0.0, "precision": 0.0, "recall": 0.0, "mrr": 0.0}
