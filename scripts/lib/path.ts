type Orderable = {
  id: string;
  track: string;
  roles: readonly string[];
};

export const ALL_ROLES = "all";

function queuesByTrack(lessons: Orderable[]) {
  const queues = new Map<string, string[]>();
  for (const { id, track } of lessons) {
    queues.set(track, [...(queues.get(track) ?? []), id]);
  }
  return queues;
}

export function buildOrder({ lessons, cycle }: {
  lessons: Orderable[];
  cycle: string[];
}) {
  const queues = queuesByTrack(lessons);
  const order: string[] = [];
  for (let isProgressing = true; isProgressing;) {
    isProgressing = false;
    for (const track of cycle) {
      const next = queues.get(track)?.shift();
      if (!next) {
        continue;
      }

      order.push(next);
      isProgressing = true;
    }
  }
  for (const queue of queues.values()) {
    order.push(...queue);
  }
  return order;
}

export function buildOrders({ lessons, cycle, roles }: {
  lessons: Orderable[];
  cycle: string[];
  roles: readonly string[];
}) {
  const orders: Record<string, string[]> = {
    [ALL_ROLES]: buildOrder({
      lessons,
      cycle
    })
  };
  for (const role of roles) {
    orders[role] = buildOrder({
      lessons: lessons.filter(lesson => lesson.roles.includes(role)),
      cycle
    });
  }
  return orders;
}
