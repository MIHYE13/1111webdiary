(() => {
  const Recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  let activeSession = null;

  function updateButton(control, isListening) {
    control.button.setAttribute("aria-pressed", String(isListening));
    control.button.classList.toggle("is-listening", isListening);
    control.label.textContent = isListening ? "듣는 중" : "말로 입력";
  }

  function combineText(baseText, spokenText, maxLength) {
    const separator = baseText && spokenText && !baseText.endsWith(" ") ? " " : "";
    return `${baseText}${separator}${spokenText}`.slice(0, maxLength);
  }

  function finishSession(session, message) {
    updateButton(session.control, false);
    session.control.status.textContent = message;
    if (activeSession === session) {
      activeSession = null;
    }
  }

  function errorMessage(error) {
    const messages = {
      "not-allowed": "마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.",
      "audio-capture": "사용할 수 있는 마이크를 찾지 못했습니다.",
      "no-speech": "음성이 들리지 않았어요. 다시 눌러 천천히 말해 주세요.",
      network: "음성 인식 서비스에 연결하지 못했습니다.",
    };
    return messages[error] || "음성을 인식하지 못했습니다. 다시 시도해 주세요.";
  }

  function start(control) {
    if (!Recognition || control.button.disabled) {
      return;
    }

    if (activeSession) {
      if (activeSession.control === control) {
        activeSession.manuallyStopped = true;
        activeSession.recognition.stop();
        return;
      }
      activeSession.manuallyStopped = true;
      activeSession.recognition.abort();
    }

    const recognition = new Recognition();
    const session = {
      control,
      recognition,
      baseText: control.input.value.trimEnd(),
      manuallyStopped: false,
      failed: false,
    };
    activeSession = session;

    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      updateButton(control, true);
      control.status.textContent =
        "듣고 있어요. 문장을 말한 뒤 잠시 멈추거나 버튼을 다시 누르세요.";
    };

    recognition.onresult = (event) => {
      let spokenText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        spokenText += event.results[index][0].transcript;
      }
      control.input.value = combineText(
        session.baseText,
        spokenText.trim(),
        control.input.maxLength || Number.MAX_SAFE_INTEGER,
      );
      control.input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" && session.manuallyStopped) {
        return;
      }
      session.failed = true;
      finishSession(session, errorMessage(event.error));
    };

    recognition.onend = () => {
      if (session.failed) {
        return;
      }
      const message = session.manuallyStopped
        ? "음성 입력을 멈췄어요. 인식된 글을 확인해 주세요."
        : "음성 입력이 끝났어요. 인식된 글을 확인해 주세요.";
      finishSession(session, message);
      control.input.focus();
    };

    try {
      recognition.start();
    } catch {
      finishSession(session, "마이크를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  function register({ button, input, status }) {
    const label = button.querySelector("[data-voice-label]");
    const control = { button, input, status, label };

    if (!Recognition) {
      button.disabled = true;
      button.title = "이 브라우저는 음성 입력을 지원하지 않습니다.";
      status.textContent =
        "이 브라우저에서는 음성 입력을 지원하지 않습니다. 키보드로 입력해 주세요.";
      return;
    }

    button.addEventListener("click", () => start(control));
  }

  window.speechInput = Object.freeze({
    isSupported: Boolean(Recognition),
    register,
  });
})();
