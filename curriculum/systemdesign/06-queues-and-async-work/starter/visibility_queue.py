from dataclasses import dataclass


@dataclass
class Message:
    id: int
    body: str
    receive_count: int = 0


class VisibilityQueue:
    def __init__(self, visibility_timeout, max_receives, now):
        self.visibility_timeout = visibility_timeout
        self.max_receives = max_receives
        self.now = now
        self.dead_letters = []

    def send(self, body):
        return 0

    def receive(self):
        return None

    def ack(self, message_id):
        return False

    def nack(self, message_id):
        pass
