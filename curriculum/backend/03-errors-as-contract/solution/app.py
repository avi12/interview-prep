import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_MEDIA_TYPE = "application/problem+json"
PROBLEM_BASE_URL = "https://api.example.com/problems"
LOCATION_KIND_PARTS = 1

logger = logging.getLogger("api")

ITEMS = {1: {"id": 1, "name": "keyboard", "price": 120}}


class ItemNotFound(Exception):
    def __init__(self, item_id):
        self.item_id = item_id


class NewItem(BaseModel):
    name: str = Field(min_length=1)
    price: int = Field(gt=0)


def problem_response(*, status, title, detail, instance, type_url="about:blank", headers=None, **extensions):
    code = int(status)
    body = {"type": type_url, "title": title, "status": code, "detail": detail, "instance": instance, **extensions}
    return JSONResponse(status_code=code, content=body, headers=headers, media_type=PROBLEM_MEDIA_TYPE)


def field_errors(exc):
    return [
        {"field": ".".join(str(part) for part in error["loc"][LOCATION_KIND_PARTS:]), "message": error["msg"]}
        for error in exc.errors()
    ]


app = FastAPI()


@app.exception_handler(ItemNotFound)
async def handle_item_not_found(request: Request, exc: ItemNotFound):
    return problem_response(
        status=HTTPStatus.NOT_FOUND,
        title="Item not found",
        detail=f"No item with id {exc.item_id}",
        instance=request.url.path,
        type_url=f"{PROBLEM_BASE_URL}/item-not-found",
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    return problem_response(
        status=HTTPStatus.UNPROCESSABLE_ENTITY,
        title="Your request is not valid",
        detail="One or more fields failed validation",
        instance=request.url.path,
        type_url=f"{PROBLEM_BASE_URL}/validation-error",
        errors=field_errors(exc),
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(request: Request, exc: StarletteHTTPException):
    return problem_response(
        status=exc.status_code,
        title=HTTPStatus(exc.status_code).phrase,
        detail=str(exc.detail),
        instance=request.url.path,
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return problem_response(
        status=HTTPStatus.INTERNAL_SERVER_ERROR,
        title=HTTPStatus.INTERNAL_SERVER_ERROR.phrase,
        detail="Something went wrong on our side",
        instance=request.url.path,
    )


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
