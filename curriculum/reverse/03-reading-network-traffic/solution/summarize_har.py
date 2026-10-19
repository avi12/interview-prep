PHASES = ("blocked", "dns", "connect", "send", "wait", "receive")
SLOWEST_COUNT = 3
REDIRECT_STATUSES = {301, 302, 303, 307, 308}
AUTHORIZATION = "authorization"


def header_value(headers, name):
    for header in headers:
        if header["name"].lower() == name:
            return header["value"]
    return None


def dominant_phase(timings):
    return max(PHASES, key=lambda phase: timings.get(phase, -1))


def find_slowest(entries):
    ranked = sorted(entries, key=lambda entry: entry["time"], reverse=True)
    return [
        {"url": entry["request"]["url"], "time": entry["time"], "phase": dominant_phase(entry["timings"])}
        for entry in ranked[:SLOWEST_COUNT]
    ]


def find_authorized(entries):
    authorized = []
    for entry in entries:
        value = header_value(entry["request"]["headers"], AUTHORIZATION)
        if value is None:
            continue
        authorized.append({"url": entry["request"]["url"], "scheme": value.partition(" ")[0]})
    return authorized


def follow_redirects(entries):
    if not entries:
        return []
    entry_by_url = {}
    for entry in entries:
        entry_by_url.setdefault(entry["request"]["url"], entry)
    chain = [entries[0]["request"]["url"]]
    while (entry := entry_by_url.get(chain[-1])) is not None:
        response = entry["response"]
        target = response["redirectURL"]
        if response["status"] not in REDIRECT_STATUSES or not target or target in chain:
            break
        chain.append(target)
    return chain


def summarize_har(har):
    entries = har["log"]["entries"]
    return {
        "slowest": find_slowest(entries),
        "authorized": find_authorized(entries),
        "redirect_chain": follow_redirects(entries),
    }
