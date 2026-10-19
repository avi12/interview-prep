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
        self.messages = {}
        self.visible_at = {}
        self.next_id = 1

    def send(self, body):
        message = Message(id=self.next_id, body=body)
        self.messages[message.id] = message
        self.visible_at[message.id] = self.now()
        self.next_id += 1
        return message.id

    def receive(self):
        for message_id in sorted(self.messages):
            if not self._is_visible(message_id):
                continue
            message = self.messages[message_id]
            if message.receive_count >= self.max_receives:
                self._move_to_dead_letters(message_id)
                continue
            message.receive_count += 1
            self.visible_at[message_id] = self.now() + self.visibility_timeout
            return message
        return None

    def ack(self, message_id):
        if message_id not in self.messages:
            return False
        del self.messages[message_id]
        del self.visible_at[message_id]
        return True

    def nack(self, message_id):
        if message_id in self.messages:
            self.visible_at[message_id] = self.now()

    def _is_visible(self, message_id):
        return self.visible_at[message_id] <= self.now()

    def _move_to_dead_letters(self, message_id):
        self.dead_letters.append(self.messages.pop(message_id))
        del self.visible_at[message_id]
