import { describeProgress } from "@scripts/lib/study.ts";
import * as vscode from "vscode";

import { Command } from "@/contributions.ts";
import type { Course } from "@/course.ts";

const STATUS_ITEM_ID = "interviewPrep.topics";
const STATUS_ITEM_NAME = "Topics";
const STATUS_ITEM_PRIORITY = 110;

export function createTopicsStatus(course: Course) {
  const item = vscode.window.createStatusBarItem(STATUS_ITEM_ID, vscode.StatusBarAlignment.Left, STATUS_ITEM_PRIORITY);
  item.name = STATUS_ITEM_NAME;
  item.command = Command.CHOOSE_TRACKS;

  function render() {
    const progress = course.pickedProgress();
    const trackCount = course.pickedTrackCount();
    const topics = trackCount === 1 ? "1 topic" : `${trackCount} topics`;
    item.text = `$(filter) ${topics} - ${progress.passed}/${progress.total} done`;
    item.tooltip = `${describeProgress(progress)}. Click to change what you are learning`;
  }

  render();
  item.show();
  return {
    render,
    dispose: () => item.dispose()
  };
}
