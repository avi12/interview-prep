import { requestTutorView } from "./request-tutor-view.ts";

const TUTOR_VIEW_URL = String(import.meta.env.WXT_TUTOR_VIEW_URL);

export function fetchTutorView() {
  return requestTutorView(TUTOR_VIEW_URL);
}
