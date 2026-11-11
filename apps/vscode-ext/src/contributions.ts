export const Command = {
  openLesson: "interviewPrep.openLesson",
  nextLesson: "interviewPrep.nextLesson",
  goToCurrentLesson: "interviewPrep.goToCurrentLesson",
  runTests: "interviewPrep.runTests",
  resetExercise: "interviewPrep.resetExercise",
  markDone: "interviewPrep.markDone",
  askClaude: "interviewPrep.askClaude",
  chooseRole: "interviewPrep.chooseRole",
  chooseTracks: "interviewPrep.chooseTracks",
  addTopic: "interviewPrep.addTopic",
  refresh: "interviewPrep.refresh",
  showPath: "interviewPrep.showPath",
  showTracks: "interviewPrep.showTracks"
} as const;

export const VoiceCommand = {
  openVoiceTutor: "interviewPrep.openVoiceTutor",
  setGeminiApiKey: "interviewPrep.setGeminiApiKey",
  clearGeminiApiKey: "interviewPrep.clearGeminiApiKey"
} as const;

export const IS_LOCAL_CONTEXT_KEY = "interviewPrep.isLocal";

export const LOCAL_ONLY_COMMANDS = [
  Command.askClaude,
  VoiceCommand.openVoiceTutor,
  VoiceCommand.setGeminiApiKey,
  VoiceCommand.clearGeminiApiKey
] as const;
