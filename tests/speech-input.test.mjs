import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../speech-input.js", import.meta.url),
  "utf8",
);

function createButton() {
  const attributes = new Map();
  const classes = new Set();
  const label = { textContent: "말로 입력" };
  let clickHandler;

  return {
    attributes,
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
    classes,
    disabled: false,
    label,
    title: "",
    addEventListener(type, handler) {
      if (type === "click") clickHandler = handler;
    },
    click() {
      clickHandler?.();
    },
    querySelector() {
      return label;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
}

function loadSpeechInput(Recognition) {
  const window = {};
  if (Recognition) window.SpeechRecognition = Recognition;
  const context = vm.createContext({
    Event: class Event {
      constructor(type) {
        this.type = type;
      }
    },
    Number,
    window,
  });
  vm.runInContext(source, context);
  return window.speechInput;
}

test("recognized Korean text is appended to the current input", () => {
  class Recognition {
    static latest;

    constructor() {
      Recognition.latest = this;
    }

    start() {
      this.onstart();
    }
  }

  const speechInput = loadSpeechInput(Recognition);
  const button = createButton();
  const input = {
    value: "기존 문장",
    maxLength: 30,
    dispatched: [],
    dispatchEvent(event) {
      this.dispatched.push(event.type);
    },
    focus() {},
  };
  const status = { textContent: "" };

  speechInput.register({ button, input, status });
  button.click();
  Recognition.latest.onresult({
    results: [[{ transcript: "새로운 음성 문장" }]],
  });

  assert.equal(input.value, "기존 문장 새로운 음성 문장");
  assert.deepEqual(input.dispatched, ["input"]);
  assert.equal(button.attributes.get("aria-pressed"), "true");
});

test("unsupported browsers keep voice input unavailable", () => {
  const speechInput = loadSpeechInput(undefined);
  const button = createButton();
  const input = { value: "", maxLength: 100 };
  const status = { textContent: "" };

  speechInput.register({ button, input, status });

  assert.equal(speechInput.isSupported, false);
  assert.equal(button.disabled, true);
  assert.match(status.textContent, /지원하지 않습니다/);
});
