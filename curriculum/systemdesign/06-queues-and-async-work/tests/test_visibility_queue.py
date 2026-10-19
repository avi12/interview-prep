from impl import load_impl

VisibilityQueue = load_impl(__file__, "visibility_queue.py").VisibilityQueue

VISIBILITY_TIMEOUT = 30
MAX_RECEIVES = 3
JUST_BEFORE_TIMEOUT = VISIBILITY_TIMEOUT - 1
JUST_AFTER_TIMEOUT = VISIBILITY_TIMEOUT + 1


class FakeClock:
    def __init__(self):
        self.current = 0.0

    def __call__(self):
        return self.current

    def advance(self, seconds):
        self.current += seconds


def make_queue(max_receives=MAX_RECEIVES):
    clock = FakeClock()
    queue = VisibilityQueue(visibility_timeout=VISIBILITY_TIMEOUT, max_receives=max_receives, now=clock)
    return queue, clock


def test_receive_on_an_empty_queue_returns_none():
    queue, _ = make_queue()
    assert queue.receive() is None


def test_send_returns_increasing_ids_starting_at_one():
    queue, _ = make_queue()
    assert [queue.send("a"), queue.send("b"), queue.send("c")] == [1, 2, 3]


def test_receive_returns_the_message_and_counts_the_delivery():
    queue, _ = make_queue()
    message_id = queue.send("welcome email")
    message = queue.receive()
    assert (message.id, message.body, message.receive_count) == (message_id, "welcome email", 1)


def test_messages_come_out_oldest_first():
    queue, _ = make_queue()
    for body in ["a", "b", "c"]:
        queue.send(body)
    assert [queue.receive().body for _ in range(3)] == ["a", "b", "c"]


def test_a_received_message_is_hidden_from_other_consumers():
    queue, _ = make_queue()
    queue.send("only")
    assert queue.receive() is not None
    assert queue.receive() is None


def test_a_hidden_message_does_not_block_the_ones_behind_it():
    queue, _ = make_queue()
    queue.send("first")
    queue.send("second")
    queue.receive()
    assert queue.receive().body == "second"


def test_the_message_stays_hidden_until_the_visibility_timeout_passes():
    queue, clock = make_queue()
    queue.send("job")
    queue.receive()
    clock.advance(JUST_BEFORE_TIMEOUT)
    assert queue.receive() is None
    clock.advance(2)
    assert queue.receive() is not None


def test_the_timeout_counts_from_the_receive_not_from_the_send():
    queue, clock = make_queue()
    queue.send("job")
    clock.advance(JUST_AFTER_TIMEOUT * 10)
    queue.receive()
    clock.advance(JUST_BEFORE_TIMEOUT)
    assert queue.receive() is None


def test_an_unacked_message_comes_back_with_a_higher_receive_count():
    queue, clock = make_queue()
    message_id = queue.send("job")
    queue.receive()
    clock.advance(JUST_AFTER_TIMEOUT)
    again = queue.receive()
    assert (again.id, again.receive_count) == (message_id, 2)


def test_two_consumers_can_both_get_the_same_message_if_the_first_is_too_slow():
    queue, clock = make_queue()
    message_id = queue.send("job")
    first_consumer = queue.receive()
    clock.advance(JUST_AFTER_TIMEOUT)
    second_consumer = queue.receive()
    assert first_consumer.id == second_consumer.id == message_id


def test_ack_deletes_the_message_for_good():
    queue, clock = make_queue()
    message_id = queue.send("job")
    queue.receive()
    assert queue.ack(message_id) is True
    clock.advance(JUST_AFTER_TIMEOUT * 10)
    assert queue.receive() is None


def test_ack_of_an_unknown_or_already_deleted_message_returns_false():
    queue, _ = make_queue()
    message_id = queue.send("job")
    queue.receive()
    assert queue.ack(999) is False
    assert queue.ack(message_id) is True
    assert queue.ack(message_id) is False


def test_nack_makes_the_message_visible_again_right_away():
    queue, _ = make_queue()
    message_id = queue.send("job")
    queue.receive()
    queue.nack(message_id)
    again = queue.receive()
    assert (again.id, again.receive_count) == (message_id, 2)


def test_nack_of_an_unknown_message_does_nothing():
    queue, _ = make_queue()
    queue.nack(42)
    assert queue.receive() is None


def test_a_message_can_be_received_exactly_max_receives_times():
    queue, _ = make_queue(max_receives=MAX_RECEIVES)
    message_id = queue.send("poison")
    counts = []
    for _ in range(MAX_RECEIVES):
        message = queue.receive()
        counts.append(message.receive_count)
        queue.nack(message_id)
    assert counts == [1, 2, 3]


def test_a_poison_message_moves_to_the_dead_letters_instead_of_being_delivered_again():
    queue, _ = make_queue(max_receives=MAX_RECEIVES)
    message_id = queue.send("poison")
    for _ in range(MAX_RECEIVES):
        queue.receive()
        queue.nack(message_id)
    assert queue.receive() is None
    assert [message.id for message in queue.dead_letters] == [message_id]
    assert queue.dead_letters[0].body == "poison"


def test_a_message_that_always_times_out_also_ends_up_in_the_dead_letters():
    queue, clock = make_queue(max_receives=2)
    message_id = queue.send("slow job")
    for _ in range(2):
        queue.receive()
        clock.advance(JUST_AFTER_TIMEOUT)
    assert queue.receive() is None
    assert [message.id for message in queue.dead_letters] == [message_id]


def test_a_message_that_is_being_processed_is_not_dead_lettered_early():
    queue, _ = make_queue(max_receives=1)
    message_id = queue.send("job")
    queue.receive()
    assert queue.receive() is None
    assert queue.dead_letters == []
    assert queue.ack(message_id) is True


def test_a_poison_message_does_not_block_healthy_messages():
    queue, _ = make_queue(max_receives=2)
    poison_id = queue.send("poison")
    queue.send("healthy")
    for _ in range(2):
        queue.receive()
        queue.nack(poison_id)
    assert queue.receive().body == "healthy"
    assert len(queue.dead_letters) == 1


def test_an_acked_message_never_reaches_the_dead_letters():
    queue, clock = make_queue(max_receives=1)
    message_id = queue.send("job")
    queue.receive()
    queue.ack(message_id)
    clock.advance(JUST_AFTER_TIMEOUT)
    assert queue.receive() is None
    assert queue.dead_letters == []
