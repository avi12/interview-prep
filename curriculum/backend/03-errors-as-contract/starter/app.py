import logging

from fastapi import FastAPI
from pydantic import BaseModel, Field

PROBLEM_MEDIA_TYPE = "application/problem+json"
PROBLEM_BASE_URL = "https://api.example.com/problems"

logger = logging.getLogger("api")

ITEMS = {1: {"id": 1, "name": "keyboard", "price": 120}}


class ItemNotFound(Exception):
    def __init__(self, item_id):
        self.item_id = item_id


class NewItem(BaseModel):
    name: str = Field(min_length=1)
    price: int = Field(gt=0)


app = FastAPI()


@app.get("/items/{item_id}")
def read_item(item_id: int):
    if item_id not in ITEMS:
        raise ItemNotFound(item_id)
    return ITEMS[item_id]


@app.post("/items", status_code=201)
def create_item(item: NewItem):
    new_id = max(ITEMS) + 1
    ITEMS[new_id] = {"id": new_id, **item.model_dump()}
    return ITEMS[new_id]


@app.get("/crash")
def crash():
    raise RuntimeError("could not connect to postgres://admin:hunter2@db.internal:5432/prod")
