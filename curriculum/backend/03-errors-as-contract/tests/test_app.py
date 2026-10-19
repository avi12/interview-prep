import logging

import pytest
from fastapi.testclient import TestClient
from impl import load_impl

module = load_impl(__file__, "app.py")
client = TestClient(module.app, raise_server_exceptions=False)

PROBLEM_MEDIA_TYPE = "application/problem+json"
CORE_MEMBERS = {"type", "title", "status", "detail", "instance"}
LEAKY_WORDS = ["hunter2", "postgres", "RuntimeError", "Traceback", "db.internal", "File \""]


def media_type_of(response):
    return response.headers["content-type"].split(";")[0].strip()


def problem_of(response, status):
    assert response.status_code == status
    assert media_type_of(response) == PROBLEM_MEDIA_TYPE, "errors must be served as application/problem+json"
    body = response.json()
    assert body["status"] == status, "the status member must match the HTTP status"
    return body


def test_successful_responses_are_not_touched():
    response = client.get("/items/1")
    assert response.status_code == 200
    assert media_type_of(response) == "application/json"
    assert response.json()["id"] == 1


def test_created_item_still_returns_201():
    response = client.post("/items", json={"name": "mouse", "price": 40})
    assert response.status_code == 201
    assert response.json()["name"] == "mouse"


def test_domain_exception_becomes_a_404_problem_with_its_own_type():
    body = problem_of(client.get("/items/99"), 404)
    assert body["type"] == f"{module.PROBLEM_BASE_URL}/item-not-found"
    assert "99" in body["detail"]
    assert body["instance"] == "/items/99"


def test_unknown_route_is_a_404_problem_with_the_default_type():
    body = problem_of(client.get("/nope"), 404)
    assert body["type"] == "about:blank"
    assert body["title"] == "Not Found"
    assert body["instance"] == "/nope"


def test_wrong_method_is_a_405_problem_and_keeps_the_allow_header():
    response = client.delete("/items/1")
    body = problem_of(response, 405)
    assert body["title"] == "Method Not Allowed"
    assert "GET" in response.headers["allow"]


def test_invalid_body_is_a_422_problem_listing_every_bad_field():
    body = problem_of(client.post("/items", json={"name": "", "price": -5}), 422)
    assert body["type"] == f"{module.PROBLEM_BASE_URL}/validation-error"
    assert {error["field"] for error in body["errors"]} == {"name", "price"}
    assert all(isinstance(error["message"], str) and error["message"] for error in body["errors"])


def test_missing_fields_are_reported_by_field_name():
    body = problem_of(client.post("/items", json={}), 422)
    assert {error["field"] for error in body["errors"]} == {"name", "price"}


def test_bad_path_parameter_is_reported_by_its_name():
    body = problem_of(client.get("/items/abc"), 422)
    assert [error["field"] for error in body["errors"]] == ["item_id"]


def test_validation_errors_do_not_echo_the_submitted_input_back():
    response = client.post("/items", json={"name": "ok", "price": "my-secret-card-number"})
    assert response.status_code == 422
    assert "my-secret-card-number" not in response.text


def test_unexpected_error_is_a_500_problem():
    body = problem_of(client.get("/crash"), 500)
    assert body["title"] == "Internal Server Error"
    assert body["type"] == "about:blank"


@pytest.mark.parametrize("word", LEAKY_WORDS)
def test_unexpected_error_does_not_leak_internals(word):
    response = client.get("/crash")
    assert word not in response.text


def test_unexpected_error_is_still_logged_for_the_team(caplog):
    with caplog.at_level(logging.ERROR):
        client.get("/crash")
    assert any(record.levelno >= logging.ERROR for record in caplog.records), "hide it from the client, never from your logs"


@pytest.mark.parametrize(
    "send",
    [
        lambda: client.get("/items/99"),
        lambda: client.get("/nope"),
        lambda: client.delete("/items/1"),
        lambda: client.post("/items", json={}),
        lambda: client.get("/crash"),
    ],
)
def test_every_error_has_the_same_core_members(send):
    response = send()
    assert response.status_code >= 400
    assert CORE_MEMBERS <= set(response.json())
