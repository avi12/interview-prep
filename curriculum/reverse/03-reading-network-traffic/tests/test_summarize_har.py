import json
from pathlib import Path

from impl import load_impl

summarize_har = load_impl(__file__, "summarize_har.py").summarize_har

FIXTURE = Path(__file__).resolve().parents[1] / "starter" / "shop.har"
SECRET_TOKEN = "demo-not-a-real-token"
SECRET_BASIC = "ZGVtbzpub3QtcmVhbA=="


def load_fixture():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def make_entry(url, status=200, time=100, headers=(), redirect="", timings=None):
    return {
        "request": {
            "method": "GET",
            "url": url,
            "headers": [{"name": name, "value": value} for name, value in headers],
        },
        "response": {"status": status, "redirectURL": redirect, "headers": []},
        "time": time,
        "timings": timings or {"blocked": -1, "dns": -1, "connect": -1, "send": 0, "wait": time, "receive": 0},
    }


def make_har(*entries):
    return {"log": {"version": "1.2", "entries": list(entries)}}


def test_slowest_are_the_three_longest_requests_with_their_main_phase():
    summary = summarize_har(load_fixture())
    assert summary["slowest"] == [
        {"url": "https://api.shop.test/v2/orders/17", "time": 1500, "phase": "connect"},
        {"url": "https://api.shop.test/v2/cart", "time": 980, "phase": "wait"},
        {"url": "https://api.shop.test/v1/products", "time": 450, "phase": "wait"},
    ]


def test_slowest_ranks_by_time_and_keeps_capture_order_on_ties():
    har = make_har(make_entry("https://a.test/1", time=50), make_entry("https://a.test/2", time=70), make_entry("https://a.test/3", time=50), make_entry("https://a.test/4", time=50))
    urls = [item["url"] for item in summarize_har(har)["slowest"]]
    assert urls == ["https://a.test/2", "https://a.test/1", "https://a.test/3"]


def test_slowest_phase_ignores_ssl_because_it_is_part_of_connect():
    timings = {"blocked": 0, "dns": 10, "ssl": 320, "connect": 320, "send": 1, "wait": 200, "receive": 5}
    har = make_har(make_entry("https://a.test/", time=536, timings=timings))
    assert summarize_har(har)["slowest"][0]["phase"] == "connect"


def test_slowest_phase_does_not_count_ssl_twice():
    timings = {"blocked": 0, "dns": 10, "ssl": 320, "connect": 330, "send": 1, "wait": 400, "receive": 5}
    har = make_har(make_entry("https://a.test/", time=746, timings=timings))
    assert summarize_har(har)["slowest"][0]["phase"] == "wait"


def test_fewer_than_three_requests_are_all_returned():
    har = make_har(make_entry("https://a.test/", time=5))
    assert len(summarize_har(har)["slowest"]) == 1


def test_authorized_lists_requests_that_send_credentials_in_capture_order():
    summary = summarize_har(load_fixture())
    assert summary["authorized"] == [
        {"url": "https://api.shop.test/v2/cart", "scheme": "Bearer"},
        {"url": "https://api.shop.test/v1/health", "scheme": "Basic"},
        {"url": "https://api.shop.test/v2/orders/17", "scheme": "Bearer"},
    ]


def test_authorization_header_name_is_matched_in_any_case():
    har = make_har(
        make_entry("https://a.test/1", headers=[("AUTHORIZATION", "Bearer x")]),
        make_entry("https://a.test/2", headers=[("authorization", "Basic y")]),
        make_entry("https://a.test/3", headers=[("X-Authorization-Note", "no")]),
    )
    assert [item["url"] for item in summarize_har(har)["authorized"]] == ["https://a.test/1", "https://a.test/2"]


def test_summary_never_copies_the_secret_values():
    text = json.dumps(summarize_har(load_fixture()))
    assert SECRET_TOKEN not in text
    assert SECRET_BASIC not in text


def test_redirect_chain_follows_the_first_request_to_its_final_page():
    summary = summarize_har(load_fixture())
    assert summary["redirect_chain"] == ["http://shop.test/", "https://shop.test/", "https://shop.test/home"]


def test_chain_is_just_the_first_url_when_it_does_not_redirect():
    har = make_har(make_entry("https://a.test/", status=200), make_entry("https://a.test/other", status=301, redirect="https://a.test/x"))
    assert summarize_har(har)["redirect_chain"] == ["https://a.test/"]


def test_not_modified_is_not_a_redirect():
    har = make_har(make_entry("https://a.test/", status=304, redirect="https://a.test/x"), make_entry("https://a.test/x"))
    assert summarize_har(har)["redirect_chain"] == ["https://a.test/"]


def test_chain_finds_each_target_by_url_not_by_position_in_the_capture():
    har = make_har(
        make_entry("https://a.test/a", status=301, redirect="https://a.test/b"),
        make_entry("https://a.test/c", status=302, redirect="https://a.test/d"),
        make_entry("https://a.test/b", status=302, redirect="https://a.test/c"),
        make_entry("https://a.test/d", status=200),
    )
    assert summarize_har(har)["redirect_chain"] == ["https://a.test/a", "https://a.test/b", "https://a.test/c", "https://a.test/d"]


def test_chain_stops_at_a_redirect_loop():
    har = make_har(
        make_entry("https://a.test/a", status=302, redirect="https://a.test/b"),
        make_entry("https://a.test/b", status=302, redirect="https://a.test/a"),
    )
    assert summarize_har(har)["redirect_chain"] == ["https://a.test/a", "https://a.test/b"]


def test_chain_includes_a_target_that_was_never_captured():
    har = make_har(make_entry("https://a.test/a", status=307, redirect="https://other.test/b"))
    assert summarize_har(har)["redirect_chain"] == ["https://a.test/a", "https://other.test/b"]


def test_empty_capture_gives_empty_summary():
    assert summarize_har(make_har()) == {"slowest": [], "authorized": [], "redirect_chain": []}
