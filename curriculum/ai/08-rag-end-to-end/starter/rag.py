import re
from dataclasses import dataclass, field
from math import sqrt

NO_ANSWER_TEXT = "I don't know based on the provided documents."
DEFAULT_TOP_K = 3
DEFAULT_MIN_SCORE = 0.25
DEFAULT_CHUNK_WORDS = 25
STOPWORDS = frozenset(
    "a an the is are was were do does did i you we it to of in on for how what when where who "
    "can my your and or be with at by from that this as if will have has many long much".split()
)
WORD_PATTERN = re.compile(r"[a-z0-9]+")
SENTENCE_BREAK = re.compile(r"(?<=[.!?])\s+")
CITATION_PATTERN = re.compile(r"\[(\d+)\]")
MIN_WORD_LENGTH_FOR_PLURAL = 4


@dataclass(frozen=True)
class Chunk:
    id: str
    text: str
    vector: dict = field(compare=False, repr=False)


@dataclass(frozen=True)
class Hit:
    chunk: Chunk
    score: float


@dataclass(frozen=True)
class Answer:
    text: str
    sources: list
    is_grounded: bool


def _stem(word):
    is_plural = len(word) >= MIN_WORD_LENGTH_FOR_PLURAL and word.endswith("s") and not word.endswith("ss")
    return word[:-1] if is_plural else word


def toy_embed(text):
    vector = {}
    for word in WORD_PATTERN.findall(text.lower()):
        if word in STOPWORDS:
            continue
        key = _stem(word)
        vector[key] = vector.get(key, 0.0) + 1.0
    return vector


def cosine(left, right):
    dot = sum(value * right.get(word, 0.0) for word, value in left.items())
    left_size = sqrt(sum(value * value for value in left.values()))
    right_size = sqrt(sum(value * value for value in right.values()))
    if left_size == 0 or right_size == 0:
        return 0.0
    return dot / (left_size * right_size)


def chunk_document(*, doc_id, text, max_words=DEFAULT_CHUNK_WORDS):
    pieces = []
    current = []
    for sentence in SENTENCE_BREAK.split(text.strip()):
        candidate = current + [sentence]
        if current and len(" ".join(candidate).split()) > max_words:
            pieces.append(" ".join(current))
            current = [sentence]
            continue
        current = candidate
    if current:
        pieces.append(" ".join(current))
    return [Chunk(id=f"{doc_id}#{number}", text=piece, vector=toy_embed(piece)) for number, piece in enumerate(pieces, start=1)]


def build_index(*, docs, max_words=DEFAULT_CHUNK_WORDS):
    index = []
    for doc_id, text in docs.items():
        index.extend(chunk_document(doc_id=doc_id, text=text, max_words=max_words))
    return index


def retrieve(*, index, question, top_k=DEFAULT_TOP_K, min_score=DEFAULT_MIN_SCORE):
    return []


def build_prompt(*, question, hits):
    return ""


def cited_sources(*, reply, hits):
    return []


def answer(*, model, index, question, top_k=DEFAULT_TOP_K, min_score=DEFAULT_MIN_SCORE):
    return Answer(text=NO_ANSWER_TEXT, sources=[], is_grounded=False)
