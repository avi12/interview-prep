import pytest
from impl import load_impl

rag = load_impl(__file__, "rag.py")
build_index = rag.build_index
retrieve = rag.retrieve
build_prompt = rag.build_prompt
cited_sources = rag.cited_sources
answer = rag.answer
NO_ANSWER_TEXT = rag.NO_ANSWER_TEXT

FAQ = {
    "refunds": "Refunds are available within 30 days of purchase. Contact support with your order number to start a refund. Digital gift cards cannot be refunded.",
    "shipping": "Standard shipping takes 5 to 7 business days. Express shipping takes 2 business days and costs extra.",
    "passwords": "To reset your password, open Settings and choose Reset password. A reset link is emailed to you and expires after one hour.",
    "warranty": "Every device has a one year warranty that covers manufacturing defects. Water damage is not covered.",
}
LIBRARY = {
    "hours": "The library opens at 9 am and closes at 6 pm on weekdays. On Saturdays it closes at 2 pm. It is closed on Sundays.",
    "borrowing": "Members can borrow up to 10 books for 21 days. Late books cost 20 cents per day.",
    "cards": "A library card is free for residents. Bring a photo ID to the front desk to get one.",
}


class ScriptedModel:
    def __init__(self, replies):
        self.replies = list(replies)
        self.prompts = []

    def complete(self, prompt):
        self.prompts.append(prompt)
        if not self.replies:
            raise AssertionError("the model was called more times than the script allows")
        return self.replies.pop(0)


@pytest.fixture
def faq_index():
    return build_index(docs=FAQ)


@pytest.fixture
def library_index():
    return build_index(docs=LIBRARY)


LABEL_WIDTH = 8


def label_before(prompt, text):
    start = prompt.index(text)
    return prompt[max(0, start - LABEL_WIDTH):start]


def chunk_text(index, chunk_id):
    return next(chunk.text for chunk in index if chunk.id == chunk_id)


def test_retrieve_ranks_the_matching_chunk_first(faq_index):
    hits = retrieve(index=faq_index, question="How do I reset my password?")
    assert hits[0].chunk.id == "passwords#1"


def test_retrieve_returns_hits_best_first(faq_index):
    hits = retrieve(index=faq_index, question="refund days shipping", top_k=4, min_score=0.0)
    scores = [hit.score for hit in hits]
    assert scores == sorted(scores, reverse=True)
    assert [hit.chunk.id for hit in hits[:2]] == ["shipping#1", "refunds#1"]


def test_retrieve_never_returns_more_than_top_k(faq_index):
    hits = retrieve(index=faq_index, question="refund days shipping", top_k=1, min_score=0.0)
    assert len(hits) == 1


def test_retrieve_drops_hits_below_the_score_threshold(faq_index):
    every_hit = retrieve(index=faq_index, question="refund days shipping", top_k=4, min_score=0.0)
    threshold = (every_hit[0].score + every_hit[1].score) / 2
    kept = retrieve(index=faq_index, question="refund days shipping", top_k=4, min_score=threshold)
    assert [hit.chunk.id for hit in kept] == [every_hit[0].chunk.id]


def test_retrieve_returns_nothing_for_an_off_topic_question(faq_index):
    assert retrieve(index=faq_index, question="What is the capital of France?") == []


def test_retrieve_works_on_a_different_corpus(library_index):
    hits = retrieve(index=library_index, question="When does the library close on Saturdays?")
    assert hits[0].chunk.id == "hours#1"
    hits = retrieve(index=library_index, question="How much do late books cost?")
    assert hits[0].chunk.id == "borrowing#1"


def test_prompt_contains_the_question_and_numbered_sources_in_rank_order(faq_index):
    hits = retrieve(index=faq_index, question="refund days shipping", top_k=2, min_score=0.25)
    prompt = build_prompt(question="refund days shipping", hits=hits)
    first, second = (hit.chunk.text for hit in hits)
    assert "refund days shipping" in prompt
    assert prompt.index(first) < prompt.index(second)
    assert "[1]" in label_before(prompt, first)
    assert "[2]" in label_before(prompt, second)


def test_prompt_lets_the_model_say_it_does_not_know(faq_index):
    hits = retrieve(index=faq_index, question="How do I reset my password?")
    assert "know" in build_prompt(question="How do I reset my password?", hits=hits).lower()


def test_cited_sources_maps_numbers_to_chunk_ids_in_order_without_repeats(faq_index):
    hits = retrieve(index=faq_index, question="refund days shipping", top_k=2, min_score=0.25)
    reply = "Shipping takes days [2]. Refunds take 30 days [1]. Again, shipping [2]."
    assert cited_sources(reply=reply, hits=hits) == [hits[1].chunk.id, hits[0].chunk.id]


def test_cited_sources_ignores_numbers_that_are_not_sources(faq_index):
    hits = retrieve(index=faq_index, question="How do I reset my password?")
    assert cited_sources(reply="You can reset it [7] or [0].", hits=hits) == []


def test_weak_retrieval_says_i_dont_know_without_calling_the_model(faq_index):
    model = ScriptedModel([])
    result = answer(model=model, index=faq_index, question="What is the capital of France?")
    assert result.text == NO_ANSWER_TEXT
    assert result.sources == []
    assert result.is_grounded is False
    assert model.prompts == []


def test_a_retrieval_miss_in_another_corpus_also_skips_the_model(library_index):
    model = ScriptedModel([])
    result = answer(model=model, index=library_index, question="Who wrote Hamlet?")
    assert result.text == NO_ANSWER_TEXT
    assert model.prompts == []


def test_strong_retrieval_sends_the_sources_to_the_model_and_returns_its_reply(faq_index):
    model = ScriptedModel(["Refunds are available within 30 days of purchase [1]."])
    result = answer(model=model, index=faq_index, question="How many days do I have to ask for a refund?")
    assert result.text == "Refunds are available within 30 days of purchase [1]."
    assert len(model.prompts) == 1
    assert chunk_text(faq_index, "refunds#1") in model.prompts[0]
    assert "How many days do I have to ask for a refund?" in model.prompts[0]


def test_a_cited_answer_is_grounded_and_lists_its_sources(faq_index):
    model = ScriptedModel(["Standard shipping takes 5 to 7 business days [1]."])
    result = answer(model=model, index=faq_index, question="How long does standard shipping take?")
    assert result.sources == ["shipping#1"]
    assert result.is_grounded is True


def test_an_answer_with_no_valid_citation_is_not_grounded(faq_index):
    uncited = ScriptedModel(["Shipping takes about a week."])
    invented = ScriptedModel(["Shipping takes about a week [9]."])
    question = "How long does standard shipping take?"
    assert answer(model=uncited, index=faq_index, question=question).is_grounded is False
    assert answer(model=invented, index=faq_index, question=question).sources == []


def test_only_the_top_k_chunks_reach_the_prompt(faq_index):
    model = ScriptedModel(["Shipping takes days [1]."])
    answer(model=model, index=faq_index, question="refund days shipping", top_k=1, min_score=0.0)
    assert chunk_text(faq_index, "shipping#1") in model.prompts[0]
    assert chunk_text(faq_index, "refunds#1") not in model.prompts[0]


def test_the_threshold_controls_whether_the_model_is_called(library_index):
    question = "How do I get a library card?"
    strict = ScriptedModel([])
    relaxed = ScriptedModel(["Bring a photo ID to the front desk [1]."])
    assert answer(model=strict, index=library_index, question=question, min_score=0.99).text == NO_ANSWER_TEXT
    assert answer(model=relaxed, index=library_index, question=question, min_score=0.1).sources == ["cards#1"]
