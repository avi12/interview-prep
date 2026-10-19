import struct
from pathlib import Path

import pytest
from impl import load_impl

frames = load_impl(__file__, "frames.py")
parse_frame = frames.parse_frame
extract_audio = frames.extract_audio

FIXTURE = Path(__file__).resolve().parents[1] / "starter" / "audio-frame.hex"
WEBM_MAGIC = bytes([0x1A, 0x45, 0xDF, 0xA3])


def build_frame(headers, payload=b""):
    header_bytes = "".join(f"{name}:{value}\r\n" for name, value in headers.items()).encode("utf-8")
    return struct.pack(">H", len(header_bytes)) + header_bytes + payload


def audio_frame(payload):
    return build_frame({"Path": "audio", "X-RequestId": "abc"}, payload)


def test_fixture_frame_headers_and_payload():
    frame = parse_frame(bytes.fromhex(FIXTURE.read_text()))
    assert frame["headers"] == {
        "Path": "audio",
        "X-RequestId": "0f3a9c71d2b84e56",
        "X-Timestamp": "2026-10-19T09:30:15.250Z",
        "Content-Type": "audio/webm",
    }
    assert frame["payload"] == WEBM_MAGIC + bytes(range(16))


def test_length_prefix_is_big_endian():
    long_value = "x" * 300
    frame = parse_frame(build_frame({"Path": "audio", "X-Long": long_value}, b"\x01\x02"))
    assert frame["headers"]["X-Long"] == long_value
    assert frame["payload"] == b"\x01\x02"


def test_header_value_keeps_its_own_colons():
    frame = parse_frame(build_frame({"Path": "turn.start", "X-Timestamp": "12:30:45"}))
    assert frame["headers"]["X-Timestamp"] == "12:30:45"


def test_length_counts_bytes_not_characters():
    frame = parse_frame(build_frame({"Path": "audio", "X-Voice": "Zoé Müller"}, b"DATA"))
    assert frame["headers"]["X-Voice"] == "Zoé Müller"
    assert frame["payload"] == b"DATA"


def test_payload_is_binary_and_may_contain_line_breaks():
    payload = b"\x00\r\n\r\nPath:audio\r\n\xff\xfe"
    assert parse_frame(audio_frame(payload))["payload"] == payload


def test_empty_payload():
    assert parse_frame(audio_frame(b""))["payload"] == b""


def test_zero_length_header():
    frame = parse_frame(b"\x00\x00" + b"RAW")
    assert frame["headers"] == {}
    assert frame["payload"] == b"RAW"


@pytest.mark.parametrize("data", [b"", b"\x00"])
def test_frame_shorter_than_its_prefix_is_rejected(data):
    with pytest.raises(ValueError):
        parse_frame(data)


def test_header_longer_than_the_frame_is_rejected():
    with pytest.raises(ValueError):
        parse_frame(struct.pack(">H", 50) + b"Path:audio")


def test_extract_audio_joins_only_non_empty_audio_payloads_in_order():
    session = [
        build_frame({"Path": "turn.start"}),
        audio_frame(b"AAA"),
        audio_frame(b""),
        build_frame({"Path": "audio.metadata"}, b"{}"),
        audio_frame(b"BB"),
        build_frame({"Path": "turn.end"}),
    ]
    assert extract_audio(session) == b"AAABB"


def test_extract_audio_of_nothing_is_empty():
    assert extract_audio([]) == b""
