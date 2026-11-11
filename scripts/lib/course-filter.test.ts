import {
  effectiveTrackIds,
  groupTracksByCategory,
  nextLessonId,
  passedCount,
  pickedTrackIds,
  selectCourse,
  trackIdsByRole
} from "#scripts/lib/course-filter.ts";
import { ALL_ROLES } from "#scripts/lib/path.ts";
import { describe, expect, it } from "vitest";

const TRACKS = [
  {
    id: "sql",
    title: "SQL",
    blurb: "Queries",
    category: "interview"
  },
  {
    id: "oop",
    title: "OOP",
    blurb: "Objects",
    category: "interview"
  },
  {
    id: "support",
    title: "Support",
    blurb: "Help desk",
    category: "it-course"
  }
];
const CATEGORIES = [
  {
    id: "it-course",
    title: "IT course",
    blurb: "Tech support"
  },
  {
    id: "empty",
    title: "Empty",
    blurb: "No tracks yet"
  },
  {
    id: "interview",
    title: "Interview",
    blurb: "Developer roles"
  }
];
const LESSONS = [
  {
    id: "sql/01-select",
    track: "sql"
  },
  {
    id: "sql/02-join",
    track: "sql"
  },
  {
    id: "oop/01-classes",
    track: "oop"
  }
];
const ORDERS = {
  [ALL_ROLES]: ["sql/01-select", "oop/01-classes", "sql/02-join"],
  analyst: ["sql/01-select", "sql/02-join"]
};
const PASSED_AT = "2026-11-01T10:00:00.000Z";

function course({ role, trackIds }: {
  role: string;
  trackIds: string[];
}) {
  return selectCourse({
    tracks: TRACKS,
    orders: ORDERS,
    lessons: LESSONS,
    role,
    trackIds
  });
}

describe("selectCourse", () => {
  it("orders lessons by the role's study order", () => {
    expect(
      course({
        role: ALL_ROLES,
        trackIds: []
      }).lessons.map(lesson => lesson.id)
    ).toEqual(ORDERS[ALL_ROLES]);
    expect(
      course({
        role: "analyst",
        trackIds: []
      }).order
    ).toEqual(ORDERS.analyst);
  });

  it("keeps only the picked tracks and ignores unknown ones", () => {
    expect(
      course({
        role: ALL_ROLES,
        trackIds: ["oop", "gone"]
      }).order
    ).toEqual(["oop/01-classes"]);
    expect(
      course({
        role: ALL_ROLES,
        trackIds: ["gone"]
      }).order
    ).toEqual(ORDERS[ALL_ROLES]);
  });

  it("falls back to every role for a role the index no longer has", () => {
    expect(
      course({
        role: "retired",
        trackIds: []
      }).order
    ).toEqual(ORDERS[ALL_ROLES]);
  });
});

describe("pickedTrackIds", () => {
  it("stores every track picked as no filter", () => {
    expect(
      pickedTrackIds({
        tracks: TRACKS,
        picked: ["oop", "sql", "support"]
      })
    ).toEqual([]);
    expect(
      pickedTrackIds({
        tracks: TRACKS,
        picked: ["oop"]
      })
    ).toEqual(["oop"]);
  });
});

describe("nextLessonId and passedCount", () => {
  const progress = {
    "sql/01-select": {
      attempts: 1,
      passedAt: PASSED_AT
    }
  };

  it("finds the next unpassed lesson, skipping the current one", () => {
    const { order } = course({
      role: ALL_ROLES,
      trackIds: []
    });
    expect(
      nextLessonId({
        order,
        progress
      })
    ).toBe("oop/01-classes");
    expect(
      nextLessonId({
        order,
        progress,
        skippedId: "oop/01-classes"
      })
    ).toBe("sql/02-join");
  });

  it("counts passed lessons", () => {
    expect(
      passedCount({
        lessons: LESSONS,
        progress
      })
    ).toBe(1);
  });
});

describe("effectiveTrackIds", () => {
  it("reads no filter, or only unknown tracks, as every track", () => {
    expect(
      effectiveTrackIds({
        tracks: TRACKS,
        trackIds: []
      })
    ).toEqual(["sql", "oop", "support"]);
    expect(
      effectiveTrackIds({
        tracks: TRACKS,
        trackIds: ["gone"]
      })
    ).toEqual(["sql", "oop", "support"]);
    expect(
      effectiveTrackIds({
        tracks: TRACKS,
        trackIds: ["oop", "gone"]
      })
    ).toEqual(["oop"]);
  });
});

describe("groupTracksByCategory", () => {
  it("groups tracks under their category in category order and drops empty categories", () => {
    const groups = groupTracksByCategory({
      categories: CATEGORIES,
      tracks: TRACKS
    });
    expect(groups.map(group => group.category.id)).toEqual(["it-course", "interview"]);
    expect(groups.map(group => group.tracks.map(track => track.id))).toEqual([["support"], ["sql", "oop"]]);
  });

  it("leaves out tracks whose category is unknown", () => {
    expect(
      groupTracksByCategory({
        categories: [],
        tracks: TRACKS
      })
    ).toEqual([]);
  });
});

describe("trackIdsByRole", () => {
  it("maps each role to the tracks its lessons sit in, in track order", () => {
    const lessons = [
      {
        id: "support/01-triage",
        track: "support",
        roles: ["support"]
      },
      {
        id: "oop/01-classes",
        track: "oop",
        roles: ["backend"]
      },
      {
        id: "sql/01-select",
        track: "sql",
        roles: ["backend", "analyst"]
      }
    ];
    expect(
      trackIdsByRole({
        tracks: TRACKS,
        roles: [{ id: "backend" }, { id: "analyst" }, { id: "support" }, { id: "unused" }],
        lessons
      })
    ).toEqual({
      [ALL_ROLES]: ["sql", "oop", "support"],
      backend: ["sql", "oop"],
      analyst: ["sql"],
      support: ["support"],
      unused: []
    });
  });
});
