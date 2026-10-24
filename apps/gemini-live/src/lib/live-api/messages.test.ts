import {
  audioMessage,
  buildSetupMessage,
  contextMessage,
  parseServerMessage,
  serializeClientMessage,
  ServerEventKind
} from "./messages.ts";
import { bytesToBase64 } from "@/lib/base64.ts";
import { describe, expect, it } from "vitest";

const setupOptions = {
  model: "gemini-test",
  voice: "Kore",
  systemInstruction: "Be kind.",
  resumeHandle: null
};

describe("buildSetupMessage", () => {
  it("asks for spoken audio in the chosen voice with transcripts both ways", () => {
    const { setup } = buildSetupMessage(setupOptions);
    expect(setup.model).toBe("models/gemini-test");
    expect(setup.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe("Kore");
    expect(setup.systemInstruction.parts[0]?.text).toBe("Be kind.");
    expect(setup.inputAudioTranscription).toEqual({});
    expect(setup.outputAudioTranscription).toEqual({});
    expect(setup.contextWindowCompression).toEqual({
      slidingWindow: {}
    });
  });

  it("resumes the earlier conversation when it has a handle", () => {
    expect(buildSetupMessage(setupOptions).setup.sessionResumption).toEqual({});
    expect(
      buildSetupMessage({
        ...setupOptions,
        resumeHandle: "abc"
      }).setup.sessionResumption
    ).toEqual({ handle: "abc" });
  });
});

describe("outgoing messages", () => {
  it("labels mic audio as 16 kHz PCM", () => {
    expect(audioMessage("AAA=").realtimeInput.audio.mimeType).toBe("audio/pcm;rate=16000");
  });

  it("sends page content as a turn that does not ask for an answer", () => {
    expect(contextMessage("hello").clientContent).toEqual({
      turns: [{
        role: "user",
        parts: [{ text: "hello" }]
      }],
      turnComplete: false
    });
  });
});

describe("parseServerMessage", () => {
  it("reports setup completion", () => {
    expect(
      parseServerMessage(
        JSON.stringify({
          setupComplete: {}
        })
      )
    ).toEqual([{ kind: ServerEventKind.SETUP_COMPLETE }]);
  });

  it("decodes audio, transcripts, interruption and turn end in order", () => {
    const audio = new Uint8Array([1, 2, 3, 4]);
    const events = parseServerMessage(
      JSON.stringify({
        serverContent: {
          interrupted: true,
          modelTurn: {
            parts: [{
              inlineData: {
                mimeType: "audio/pcm;rate=24000",
                data: bytesToBase64(audio)
              }
            }]
          },
          inputTranscription: {
            text: "hi"
          },
          outputTranscription: {
            text: "hello"
          },
          turnComplete: true
        }
      })
    );
    expect(events).toEqual([
      { kind: ServerEventKind.INTERRUPTED },
      {
        kind: ServerEventKind.AUDIO,
        bytes: audio
      },
      {
        kind: ServerEventKind.USER_TEXT,
        text: "hi"
      },
      {
        kind: ServerEventKind.MODEL_TEXT,
        text: "hello"
      },
      { kind: ServerEventKind.TURN_COMPLETE }
    ]);
  });

  it("keeps only resumable handles and reports goAway", () => {
    expect(
      parseServerMessage(
        JSON.stringify({
          sessionResumptionUpdate: {
            newHandle: "h1",
            resumable: true
          },
          goAway: {
            timeLeft: "10s"
          }
        })
      )
    ).toEqual([
      {
        kind: ServerEventKind.RESUME_HANDLE,
        handle: "h1"
      },
      { kind: ServerEventKind.GO_AWAY }
    ]);
    expect(
      parseServerMessage(
        JSON.stringify({
          sessionResumptionUpdate: {
            newHandle: "h2",
            resumable: false
          }
        })
      )
    ).toEqual([]);
  });

  it("ignores text that is not a server message", () => {
    expect(parseServerMessage("not json")).toEqual([]);
    expect(
      parseServerMessage(
        JSON.stringify({
          serverContent: {
            interrupted: "yes"
          }
        })
      )
    ).toEqual([]);
  });
});

describe("serializeClientMessage", () => {
  it("sends a message that matches the Live API schema", () => {
    const text = serializeClientMessage(contextMessage("The learner opened a lesson."));
    expect(JSON.parse(text ?? "null")).toEqual(contextMessage("The learner opened a lesson."));
  });

  it("refuses a setup message with no voice", () => {
    expect(
      serializeClientMessage(
        buildSetupMessage({
          ...setupOptions,
          voice: ""
        })
      )
    ).toBeNull();
  });
});
