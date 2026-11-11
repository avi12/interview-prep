const LESSON_PARAM = "lesson";

export function lessonIdFromUrl(url: URL) {
  return url.searchParams.get(LESSON_PARAM) ?? undefined;
}

export function urlForLesson({ url, lessonId }: {
  url: URL;
  lessonId: string;
}) {
  const next = new URL(url);
  next.searchParams.set(LESSON_PARAM, lessonId);
  return next;
}
