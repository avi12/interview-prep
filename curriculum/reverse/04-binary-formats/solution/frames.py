import struct

HEADER_LENGTH_FORMAT = ">H"
HEADER_LENGTH_SIZE = struct.calcsize(HEADER_LENGTH_FORMAT)
LINE_BREAK = "\r\n"
HEADER_SEPARATOR = ":"
PATH_HEADER = "Path"
AUDIO_PATH = "audio"


def parse_headers(text):
    headers = {}
    for line in text.split(LINE_BREAK):
        name, separator, value = line.partition(HEADER_SEPARATOR)
        if not separator or not name:
            continue
        headers[name] = value.strip()
    return headers


def parse_frame(data):
    if len(data) < HEADER_LENGTH_SIZE:
        raise ValueError("frame is shorter than its 2-byte length prefix")
    (header_length,) = struct.unpack_from(HEADER_LENGTH_FORMAT, data)
    payload_start = HEADER_LENGTH_SIZE + header_length
    if payload_start > len(data):
        raise ValueError(f"header claims {header_length} bytes but the frame has {len(data) - HEADER_LENGTH_SIZE}")
    header_text = data[HEADER_LENGTH_SIZE:payload_start].decode("utf-8")
    return {"headers": parse_headers(header_text), "payload": data[payload_start:]}


def extract_audio(frames):
    chunks = []
    for data in frames:
        frame = parse_frame(data)
        if frame["headers"].get(PATH_HEADER) != AUDIO_PATH or not frame["payload"]:
            continue
        chunks.append(frame["payload"])
    return b"".join(chunks)
