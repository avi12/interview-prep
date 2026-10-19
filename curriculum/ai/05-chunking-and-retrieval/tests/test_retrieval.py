import numpy as np
import pytest
from impl import load_impl
from toy_embedding import embed

retrieval = load_impl(__file__, "retrieval.py")
chunk_text = retrieval.chunk_text
retrieve = retrieval.retrieve

BREAD_GUIDE = (
    "Bread is simple. Mix flour and water with salt. Let the dough rest for hours. "
    "To make sourdough you must feed the starter twice daily. A healthy starter smells sweet. "
    "Bake the bread in a hot oven."
)
FEEDING_QUESTION = "how often do I feed the sourdough starter"
FEEDING_WORDS = ("sourdough", "feed", "starter")

PET_NOTES = (
    "Walk the dog every morning and bring the leash. "
    "A kitten will purr when it is happy. "
    "Throw the ball so the puppy can fetch it."
)


def numbered_words(count):
    return " ".join(f"w{number}" for number in range(1, count + 1))


def letters_embedding(text):
    return np.array([text.count("a"), text.count("b")], dtype=float)


def test_cuts_words_into_windows_that_overlap():
    assert chunk_text("a b c d e f g h i j", 4, 1) == ["a b c d", "d e f g", "g h i j"]


def test_zero_overlap_cuts_plain_windows():
    assert chunk_text("a b c d e f g h i j", 4, 0) == ["a b c d", "e f g h", "i j"]


def test_does_not_add_a_tail_chunk_that_only_repeats_words():
    assert chunk_text(numbered_words(8), 5, 2) == ["w1 w2 w3 w4 w5", "w4 w5 w6 w7 w8"]


def test_short_text_is_a_single_chunk():
    assert chunk_text("a b c", 10, 2) == ["a b c"]
    assert chunk_text("a b c d", 4, 1) == ["a b c d"]


def test_empty_or_blank_text_has_no_chunks():
    assert chunk_text("", 4, 1) == []
    assert chunk_text("   \n  ", 4, 1) == []


def test_any_whitespace_counts_as_a_word_break():
    assert chunk_text("a   b\n\nc  d", 2, 0) == ["a b", "c d"]


@pytest.mark.parametrize(
    "count,size,overlap",
    [(1, 1, 0), (7, 3, 1), (100, 10, 3), (25, 5, 4), (12, 12, 0), (13, 12, 5), (50, 7, 0)],
)
def test_chunks_cover_every_word_and_overlap_by_exactly_the_requested_amount(count, size, overlap):
    chunks = [chunk.split() for chunk in chunk_text(numbered_words(count), size, overlap)]
    assert all(1 <= len(chunk) <= size for chunk in chunks)
    assert chunks[0][0] == "w1"
    assert chunks[-1][-1] == f"w{count}"
    for previous, current in zip(chunks, chunks[1:]):
        assert len(current) > overlap
        if overlap:
            assert current[:overlap] == previous[-overlap:]


@pytest.mark.parametrize("size,overlap", [(0, 0), (-3, 0), (4, -1), (4, 4), (4, 9)])
def test_rejects_sizes_that_would_never_advance(size, overlap):
    with pytest.raises(ValueError):
        chunk_text("a b c d e f", size, overlap)


def test_retrieve_returns_the_best_chunks_first():
    chunks = ["bake bread in the oven", "the dog loves to fetch", "feed the sourdough starter", "rain and storm"]
    result = retrieve("sourdough starter and bread", chunks, embed, 2)
    assert result == ["feed the sourdough starter", "bake bread in the oven"]


def test_retrieve_uses_the_embedding_function_it_is_given():
    chunks = ["aaa", "bbb", "aab"]
    assert retrieve("a", chunks, letters_embedding, 3) == ["aaa", "aab"]


def test_retrieve_drops_chunks_that_share_nothing_with_the_query():
    chunks = ["the dog loves to fetch", "bake bread in the oven", "rain and storm"]
    assert retrieve("dog", chunks, embed, 3) == ["the dog loves to fetch"]


def test_retrieve_finds_nothing_for_a_query_without_known_words():
    assert retrieve("zebra quantum", ["the dog loves to fetch", "bake bread"], embed, 3) == []


def test_retrieve_respects_k_and_handles_k_larger_than_the_corpus():
    chunks = ["dog", "dog dog", "dog fetch", "dog walk"]
    assert len(retrieve("dog", chunks, embed, 2)) == 2
    assert len(retrieve("dog", chunks, embed, 50)) == 4
    assert retrieve("dog", chunks, embed, 0) == []


def test_retrieve_keeps_the_earlier_chunk_first_on_a_tie():
    chunks = ["dog 1", "cat", "dog 2", "dog 3"]
    assert retrieve("dog", chunks, embed, 3) == ["dog 1", "dog 2", "dog 3"]
    assert retrieve("dog", ["first dog", "second dog"], embed, 2) == ["first dog", "second dog"]


def test_retrieve_keeps_the_earlier_chunk_first_on_ties_in_a_large_corpus():
    chunks = [f"{'dog' if number % 2 == 0 else 'cat'} {number}" for number in range(1000)]
    assert retrieve("dog", chunks, embed, 10) == [f"dog {number}" for number in range(0, 20, 2)]


def test_retrieve_handles_an_empty_corpus():
    assert retrieve("dog", [], embed, 3) == []


def test_retrieve_ranks_by_angle_not_by_length():
    chunks = ["dog dog dog dog fetch fetch fetch fetch bark bark bark bark", "dog fetch"]
    assert retrieve("dog fetch", chunks, embed, 1) == ["dog fetch"]


def test_overlap_keeps_a_fact_that_straddles_a_chunk_boundary():
    without_overlap = retrieve(FEEDING_QUESTION, chunk_text(BREAD_GUIDE, 7, 0), embed, 1)[0]
    with_overlap = retrieve(FEEDING_QUESTION, chunk_text(BREAD_GUIDE, 7, 3), embed, 1)[0]
    assert not all(word in without_overlap for word in FEEDING_WORDS)
    assert with_overlap == "make sourdough you must feed the starter"


def test_end_to_end_on_a_second_document():
    chunks = chunk_text(PET_NOTES, 8, 2)
    assert "puppy" in retrieve("the puppy and the ball to fetch", chunks, embed, 1)[0]
    assert "kitten" in retrieve("my kitten will purr", chunks, embed, 1)[0]
    assert "morning" in retrieve("walk the dog", chunks, embed, 1)[0]
    assert retrieve("airport and passport", chunks, embed, 3) == []
