export const Command = {
  OPEN_LESSON: "interviewPrep.openLesson",
  NEXT_LESSON: "interviewPrep.nextLesson",
  GO_TO_CURRENT_LESSON: "interviewPrep.goToCurrentLesson",
  RUN_TESTS: "interviewPrep.runTests",
  RESET_EXERCISE: "interviewPrep.resetExercise",
  MARK_DONE: "interviewPrep.markDone",
  ASK_CLAUDE: "interviewPrep.askClaude",
  CHOOSE_ROLE: "interviewPrep.chooseRole",
  CHOOSE_TRACKS: "interviewPrep.chooseTracks",
  ADD_TOPIC: "interviewPrep.addTopic",
  REFRESH: "interviewPrep.refresh",
  SHOW_PATH: "interviewPrep.showPath",
  SHOW_TRACKS: "interviewPrep.showTracks"
} as const;

export const VoiceCommand = {
  OPEN_VOICE_TUTOR: "interviewPrep.openVoiceTutor",
  SET_GEMINI_API_KEY: "interviewPrep.setGeminiApiKey",
  CLEAR_GEMINI_API_KEY: "interviewPrep.clearGeminiApiKey"
} as const;

export const IS_LOCAL_CONTEXT_KEY = "interviewPrep.isLocal";

export const LOCAL_ONLY_COMMANDS = [
  Command.ASK_CLAUDE,
  VoiceCommand.OPEN_VOICE_TUTOR,
  VoiceCommand.SET_GEMINI_API_KEY,
  VoiceCommand.CLEAR_GEMINI_API_KEY
] as const;
