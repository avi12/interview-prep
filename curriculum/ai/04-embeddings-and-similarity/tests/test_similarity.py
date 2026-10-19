import math
import time
import warnings

import numpy as np
import pytest
from impl import load_impl

similarity = load_impl(__file__, "similarity.py")
toy = load_impl(__file__, "toy_embedding.py")
cosine_similarity = similarity.cosine_similarity
top_k_similar = similarity.top_k_similar
embed = toy.embed
embed_many = toy.embed_many

PETS_AND_FOOD = [
    "the dog loves to fetch and walk",
    "my cat and kitten purr all day",
    "bake sourdough bread in a hot oven",
    "feed the starter with flour and water",
    "fix the bug in the python function",
    "write a test for every function",
    "book a flight and a hotel",
    "rain and wind and a storm",
]

TRAVEL_AND_WEATHER = [
    "pack luggage and a passport for the airport",
    "the train ticket costs more than the flight ticket",
    "a cloud brings rain and snow",
    "sun and wind all week",
    "walk the dog on the leash",
]

LARGE_ROWS = 400_000
SAMPLE_ROWS = 5_000
DIMENSIONS = 16
REQUIRED_SPEEDUP = 5


def reference_cosine(a, b):
    length_product = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    if length_product == 0:
        return 0.0
    return sum(x * y for x, y in zip(a, b)) / length_product


def indexes(result):
    return [index for index, _ in result]


def test_same_direction_scores_one_even_when_lengths_differ():
    assert cosine_similarity([1, 2], [2, 4]) == pytest.approx(1.0)
    assert cosine_similarity(embed("cat"), embed("cat cat cat")) == pytest.approx(1.0)


def test_orthogonal_vectors_score_zero():
    assert cosine_similarity([1, 0], [0, 1]) == pytest.approx(0.0)
    assert cosine_similarity(embed("dog fetch"), embed("bread oven")) == pytest.approx(0.0)


def test_opposite_vectors_score_minus_one():
    assert cosine_similarity([1, 2, 3], [-1, -2, -3]) == pytest.approx(-1.0)


def test_known_value():
    assert cosine_similarity([4, 3], [1, 5]) == pytest.approx(19 / (5 * math.sqrt(26)))


def test_accepts_lists_and_numpy_arrays():
    assert cosine_similarity(np.array([3.0, 4.0]), [3, 4]) == pytest.approx(1.0)


def test_zero_vector_scores_zero_without_warnings():
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        assert cosine_similarity([0, 0, 0], [1, 2, 3]) == 0.0
        assert cosine_similarity([1, 2, 3], [0, 0, 0]) == 0.0


def test_returns_a_plain_float():
    assert isinstance(cosine_similarity([1, 2], [3, 4]), float)


def test_top_k_finds_the_matching_documents_in_order():
    matrix = embed_many(PETS_AND_FOOD)
    result = top_k_similar(embed("how to bake bread with a sourdough starter"), matrix, 2)
    assert indexes(result) == [2, 3]
    assert [score for _, score in result] == pytest.approx([0.75, 0.25])


def test_top_k_on_a_second_corpus():
    matrix = embed_many(TRAVEL_AND_WEATHER)
    result = top_k_similar(embed("where is my passport and luggage"), matrix, 1)
    assert indexes(result) == [0]
    result = top_k_similar(embed("a walk with my dog"), matrix, 1)
    assert indexes(result) == [4]


def test_top_k_ranks_by_angle_not_by_length():
    matrix = embed_many(["dog fetch", "dog dog dog dog fetch fetch fetch fetch bark bark bark bark"])
    result = top_k_similar(embed("dog fetch"), matrix, 2)
    assert indexes(result) == [0, 1]
    assert result[0][1] == pytest.approx(1.0)
    assert result[1][1] == pytest.approx(8 / math.sqrt(96))


def test_top_k_returns_python_ints_and_floats():
    result = top_k_similar(embed("dog"), embed_many(PETS_AND_FOOD), 1)
    index, score = result[0]
    assert type(index) is int
    assert type(score) is float


def test_ties_keep_the_lower_index_first():
    matrix = embed_many(["dog", "cat", "dog", "dog"])
    result = top_k_similar(embed("dog"), matrix, 3)
    assert indexes(result) == [0, 2, 3]


def test_k_larger_than_the_corpus_returns_everything():
    matrix = embed_many(PETS_AND_FOOD)
    assert len(top_k_similar(embed("dog"), matrix, 100)) == len(PETS_AND_FOOD)


def test_k_zero_returns_nothing():
    assert top_k_similar(embed("dog"), embed_many(PETS_AND_FOOD), 0) == []


def test_rows_without_any_known_word_score_zero_not_nan():
    matrix = embed_many(["dog fetch", "zebra quantum"])
    result = top_k_similar(embed("dog"), matrix, 2)
    assert not any(math.isnan(score) for _, score in result)
    assert result[1] == (1, 0.0)


def test_a_query_with_no_known_word_scores_everything_zero():
    result = top_k_similar(embed("zebra quantum"), embed_many(PETS_AND_FOOD), 3)
    assert [score for _, score in result] == [0.0, 0.0, 0.0]


def test_does_not_change_the_inputs():
    matrix = embed_many(PETS_AND_FOOD)
    query = embed("bake bread and bake bread")
    matrix_before = matrix.copy()
    query_before = query.copy()
    top_k_similar(query, matrix, 3)
    assert np.array_equal(matrix, matrix_before)
    assert np.array_equal(query, query_before)


def test_matches_a_plain_python_reference_on_random_data():
    rng = np.random.default_rng(42)
    matrix = rng.normal(size=(500, 8))
    query = rng.normal(size=8)
    expected = sorted(((reference_cosine(query, row), i) for i, row in enumerate(matrix)), key=lambda pair: (-pair[0], pair[1]))[:10]
    result = top_k_similar(query, matrix, 10)
    assert indexes(result) == [i for _, i in expected]
    assert [score for _, score in result] == pytest.approx([score for score, _ in expected])


def test_scores_a_large_matrix_in_one_pass_instead_of_a_python_loop():
    rng = np.random.default_rng(7)
    sample = rng.random((SAMPLE_ROWS, DIMENSIONS))
    query = rng.random(DIMENSIONS)
    sample_lists = sample.tolist()
    query_list = query.tolist()
    loop_seconds = min(_time(lambda: [reference_cosine(query_list, row) for row in sample_lists]) for _ in range(3))
    budget_seconds = loop_seconds * (LARGE_ROWS / SAMPLE_ROWS) / REQUIRED_SPEEDUP
    matrix = rng.random((LARGE_ROWS, DIMENSIONS))
    started_at = time.perf_counter()
    result = top_k_similar(query, matrix, 5)
    elapsed = time.perf_counter() - started_at
    assert len(result) == 5
    assert elapsed < budget_seconds


def _time(action):
    started_at = time.perf_counter()
    action()
    return time.perf_counter() - started_at
