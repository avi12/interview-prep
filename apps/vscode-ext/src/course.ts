import { nextLessonId, pickedTrackIds, selectCourse, trackIdsByRole } from "@scripts/lib/course-filter.ts";
import { parseJson } from "@scripts/lib/json.ts";
import { INDEX_RELATIVE_PATH } from "@scripts/lib/layout.ts";
import { ALL_ROLES, ALL_ROLES_TITLE } from "@scripts/lib/path.ts";
import type { Progress } from "@scripts/lib/progress-sync.ts";
import { lessonIndexSchema } from "@scripts/lib/schema.ts";
import { isPassed, progressByTrack, progressOfLessons } from "@scripts/lib/study.ts";
import * as vscode from "vscode";

import type { CourseHost, LessonEntry, LessonIndex } from "@/courseHost.ts";

const EMPTY_INDEX: LessonIndex = {
  categories: [],
  tracks: [],
  roles: [],
  orders: {},
  lessons: []
};

const SETTINGS_SECTION = "interviewPrep";
const ROLE_SETTING = "role";
const TRACKS_SETTING = "tracks";
export const COURSE_FILTER_SETTINGS = [
  `${SETTINGS_SECTION}.${ROLE_SETTING}`,
  `${SETTINGS_SECTION}.${TRACKS_SETTING}`
] as const;

export function courseSettings() {
  return vscode.workspace.getConfiguration(SETTINGS_SECTION);
}

function selectedRole() {
  return courseSettings().get<string>(ROLE_SETTING, ALL_ROLES);
}

function selectedTrackIds() {
  return courseSettings().get<string[]>(TRACKS_SETTING, []);
}

export function createCourse(host: Pick<CourseHost, "readCourseFile" | "readProgress">) {
  let index = EMPTY_INDEX;
  let progress: Progress = {};

  async function refresh() {
    const [indexText, latestProgress] = await Promise.all([
      host.readCourseFile(INDEX_RELATIVE_PATH),
      host.readProgress()
    ]);
    index = parseJson({
      text: indexText,
      schema: lessonIndexSchema,
      fallback: EMPTY_INDEX
    });
    progress = latestProgress;
  }

  function selected() {
    const { tracks, lessons, orders } = index;
    return {
      ...selectCourse({
        tracks,
        orders,
        lessons,
        role: selectedRole(),
        trackIds: selectedTrackIds()
      }),
      progress
    };
  }

  function findLesson(id: string) {
    return index.lessons.find(lesson => lesson.id === id);
  }

  function findNextLesson(skippedId?: string) {
    const { lessons, order } = selected();
    const nextId = nextLessonId({
      order,
      progress,
      skippedId
    });
    return lessons.find(lesson => lesson.id === nextId);
  }

  function trackTitleOf(lesson: LessonEntry) {
    return index.tracks.find(track => track.id === lesson.track)?.title ?? lesson.track;
  }

  function nextLessonName(currentId: string) {
    const next = findNextLesson(currentId);
    return next ? `${next.title} (${trackTitleOf(next)})` : undefined;
  }

  function courseChoice() {
    const { categories, tracks, roles, lessons } = index;
    return {
      categories,
      tracks,
      roles,
      roleTrackIds: trackIdsByRole({
        tracks,
        roles,
        lessons
      }),
      role: selectedRole(),
      trackIds: selectedTrackIds(),
      trackProgress: progressByTrack({
        tracks,
        lessons,
        progress
      })
    };
  }

  function pickedProgress() {
    return progressOfLessons({
      lessons: selected().lessons,
      progress
    });
  }

  function pickedTrackCount() {
    return new Set(selected().lessons.map(lesson => lesson.track)).size;
  }

  async function saveCourseChoice({ role, trackIds }: { role: string; trackIds: readonly string[] }) {
    const { tracks, roles } = index;
    const isKnownRole = role === ALL_ROLES || roles.some(candidate => candidate.id === role);
    await courseSettings().update(ROLE_SETTING, isKnownRole ? role : ALL_ROLES, vscode.ConfigurationTarget.Workspace);
    await courseSettings().update(
      TRACKS_SETTING,
      pickedTrackIds({
        tracks,
        picked: trackIds
      }),
      vscode.ConfigurationTarget.Workspace
    );
  }

  async function chooseRole() {
    const choices = [
      {
        id: ALL_ROLES,
        title: ALL_ROLES_TITLE
      },
      ...index.roles
    ];
    const current = selectedRole();
    const picked = await vscode.window.showQuickPick(
      choices.map(({ id, title }) => ({
        id,
        label: title,
        description: id === current ? "current" : undefined
      })),
      { placeHolder: "Show the lessons for which role?" }
    );
    if (!picked) {
      return;
    }

    await courseSettings().update(ROLE_SETTING, picked.id, vscode.ConfigurationTarget.Workspace);
  }

  return {
    refresh,
    selected,
    findLesson,
    findNextLesson,
    isLessonPassed: (id: string) =>
      isPassed({
        id,
        progress
      }),
    trackTitleOf,
    nextLessonName,
    courseChoice,
    pickedProgress,
    pickedTrackCount,
    saveCourseChoice,
    chooseRole
  };
}

export type Course = ReturnType<typeof createCourse>;
