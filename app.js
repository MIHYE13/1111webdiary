const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskEmpty = document.querySelector("#task-empty");
const taskCount = document.querySelector("#task-count");
const diaryForm = document.querySelector("#diary-form");
const diaryInput = document.querySelector("#diary-input");
const diaryCount = document.querySelector("#diary-count");
const diaryError = document.querySelector("#diary-error");
const planPlaceholder = document.querySelector("#plan-placeholder");
const tomorrowPlan = document.querySelector("#tomorrow-plan");
const chatStatus = document.querySelector("#chat-status");
const chatLog = document.querySelector("#chat-log");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatSubmit = document.querySelector("#chat-submit");
const energyLevel = document.querySelector("#energy-level");
const todayStep = document.querySelector(".flow-nav li:first-child");
const conversationStep = document.querySelector("#conversation-step");
const planStep = document.querySelector("#plan-step");
const toast = document.querySelector("#toast");
const connectionStatusText = document.querySelector("#connection-status-text");
const diarySubmit = document.querySelector("#diary-submit");
const diarySubmitLabel = document.querySelector("#diary-submit-label");

const apiBaseUrl = window.APP_CONFIG?.API_BASE_URL?.replace(/\/+$/, "");

const tasks = [];
let nextTaskId = 1;
let toastTimer;
let isSubmittingDiary = false;
let isDiarySaved = false;
let isSendingMessage = false;
let currentDiaryId = null;

function formatKoreanDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatShortDate(date) {
  const month = new Intl.DateTimeFormat("en", { month: "short" })
    .format(date)
    .toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function setDates() {
  const now = new Date();
  document.querySelector("#today-date").textContent = formatKoreanDate(now);
  document.querySelector("#intro-date").textContent = formatShortDate(now);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2800);
}

function markDiaryChanged() {
  const conversationWasActive = Boolean(currentDiaryId);
  isDiarySaved = false;
  currentDiaryId = null;
  setChatEnabled(false);
  if (conversationWasActive) {
    tomorrowPlan.hidden = true;
    planPlaceholder.hidden = false;
    planPlaceholder.classList.remove("is-ready");
    planPlaceholder.querySelector("h3").textContent =
      "오늘의 기록이 바뀌었어요.";
    planPlaceholder.querySelector("p").textContent =
      "다시 저장하면 새 기록을 기준으로 대화를 시작할 수 있어요.";
    setCurrentStep(todayStep);
    chatStatus.textContent = "재저장 필요";
    chatStatus.classList.remove("is-ready");
    appendMessage(
      "안내",
      "오늘 기록이 바뀌었어요. 다시 저장하면 새 기록으로 대화를 시작할 수 있어요.",
      "system",
    );
  }
  if (!isSubmittingDiary) {
    diarySubmit.disabled = false;
    diarySubmitLabel.textContent = "오늘 기록 저장하기";
  }
}

function setCurrentStep(currentStep) {
  [todayStep, conversationStep, planStep].forEach((step) => {
    step.classList.remove("is-current");
    step.removeAttribute("aria-current");
  });
  currentStep.classList.add("is-current");
  currentStep.setAttribute("aria-current", "step");
}

function setChatEnabled(isEnabled) {
  chatInput.disabled = !isEnabled || isSendingMessage;
  chatSubmit.disabled = !isEnabled || isSendingMessage;
  energyLevel.disabled = !isEnabled || isSendingMessage;
  chatForm.setAttribute("aria-busy", String(isSendingMessage));
}

function setSendingMessage(isSending) {
  isSendingMessage = isSending;
  setChatEnabled(Boolean(currentDiaryId));
  if (isSending) {
    chatStatus.textContent = "답변 작성 중…";
  } else if (!currentDiaryId) {
    if (chatStatus.textContent !== "재저장 필요") {
      chatStatus.textContent = "기록 대기";
    }
  } else if (chatStatus.textContent !== "계획 저장됨") {
    chatStatus.textContent = "대화 중";
  }
  chatSubmit.textContent = isSending ? "기다리는 중" : "보내기";
}

function appendMessage(name, text, role) {
  const message = document.createElement("div");
  message.className = `message ${role}-message`;

  const messageName = document.createElement("span");
  messageName.className = "message-name";
  messageName.textContent = name;

  const messageText = document.createElement("p");
  messageText.textContent = text;

  message.append(messageName, messageText);
  chatLog.append(message);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  message.scrollIntoView({
    block: "nearest",
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

function resetChatLog() {
  chatLog.replaceChildren();
  appendMessage(
    "안내",
    "내일의 예상 에너지를 고르고, 꼭 지키고 싶은 일이나 일정부터 알려주세요.",
    "system",
  );
}

function renderPlan(plan) {
  document.querySelector("#plan-must-do").textContent = plan.must_do;
  document.querySelector("#plan-first-step").textContent =
    plan.easy_first_step;
  document.querySelector("#plan-recovery").textContent = plan.recovery;
  document.querySelector("#plan-low-energy").textContent =
    plan.low_energy_alternative;

  const niceToDo = document.querySelector("#plan-nice-to-do");
  niceToDo.replaceChildren();
  plan.nice_to_do.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    niceToDo.append(listItem);
  });

  planPlaceholder.hidden = true;
  tomorrowPlan.hidden = false;
  setCurrentStep(planStep);
}

function isConversationReply(value) {
  if (
    !value ||
    typeof value.angel !== "string" ||
    typeof value.devil !== "string" ||
    typeof value.facilitator !== "string" ||
    typeof value.plan_ready !== "boolean"
  ) {
    return false;
  }
  if (!value.plan_ready) {
    return true;
  }
  return Boolean(
    value.plan &&
      typeof value.plan.must_do === "string" &&
      Array.isArray(value.plan.nice_to_do) &&
      typeof value.plan.easy_first_step === "string" &&
      typeof value.plan.recovery === "string" &&
      typeof value.plan.low_energy_alternative === "string",
  );
}

function setSubmittingDiary(isSubmitting) {
  isSubmittingDiary = isSubmitting;
  diarySubmit.disabled = isSubmitting || isDiarySaved;
  diaryForm.setAttribute("aria-busy", String(isSubmitting));
  if (isSubmitting) {
    diarySubmitLabel.textContent = "저장 중…";
  }
}

function updateTaskSummary() {
  const completeCount = tasks.filter((task) => task.complete).length;
  taskCount.textContent = tasks.length
    ? `${completeCount} / ${tasks.length} 완료`
    : "0개";
  taskEmpty.hidden = tasks.length > 0;
}

function renderTasks() {
  taskList.replaceChildren();

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.complete ? " is-complete" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `task-${task.id}`;
    checkbox.checked = task.complete;
    checkbox.addEventListener("change", () => {
      task.complete = checkbox.checked;
      markDiaryChanged();
      renderTasks();
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = task.text;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-task";
    removeButton.textContent = "삭제";
    removeButton.setAttribute("aria-label", `${task.text} 삭제`);
    removeButton.addEventListener("click", () => {
      const taskIndex = tasks.findIndex((itemTask) => itemTask.id === task.id);
      tasks.splice(taskIndex, 1);
      markDiaryChanged();
      renderTasks();
      showToast("할 일을 삭제했어요.");
    });

    item.append(checkbox, label, removeButton);
    taskList.append(item);
  });

  updateTaskSummary();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const taskText = taskInput.value.trim();

  if (!taskText) {
    taskInput.focus();
    showToast("추가할 일을 먼저 적어주세요.");
    return;
  }

  tasks.push({ id: nextTaskId, text: taskText, complete: false });
  nextTaskId += 1;
  taskInput.value = "";
  markDiaryChanged();
  renderTasks();
  taskInput.focus();
});

diaryInput.addEventListener("input", () => {
  diaryCount.textContent = `${diaryInput.value.length.toLocaleString("ko-KR")} / 2,000`;

  if (diaryError.textContent) {
    diaryError.textContent = "";
    diaryInput.removeAttribute("aria-invalid");
  }
  markDiaryChanged();
});

diaryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmittingDiary || isDiarySaved) {
    return;
  }

  const diaryText = diaryInput.value.trim();

  if (diaryText.length < 10) {
    diaryError.textContent = "일기를 10자 이상 적어주세요.";
    diaryInput.setAttribute("aria-invalid", "true");
    diaryInput.focus();
    return;
  }

  if (!apiBaseUrl) {
    diaryError.textContent =
      "백엔드 주소가 설정되지 않았습니다. 관리자에게 알려주세요.";
    showToast("백엔드 설정을 확인해 주세요.");
    return;
  }

  diaryError.textContent = "";
  diaryInput.removeAttribute("aria-invalid");
  setSubmittingDiary(true);

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/diaries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        diary: diaryText,
        today_tasks: tasks.map(({ text, complete }) => ({ text, complete })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Diary request failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.persisted || typeof result.request_id !== "string") {
      throw new Error("Backend did not confirm persistence");
    }

    isDiarySaved = true;
    currentDiaryId = result.request_id;
    tomorrowPlan.hidden = true;
    planPlaceholder.hidden = false;
    planPlaceholder.classList.add("is-ready");
    planPlaceholder.querySelector("h3").textContent =
      "오늘의 기록을 저장했어요.";
    planPlaceholder.querySelector("p").textContent =
      "오른쪽 대화창에서 내일의 계획을 함께 정리해 보세요.";
    resetChatLog();
    setChatEnabled(true);
    chatStatus.textContent = "대화 준비됨";
    chatStatus.classList.add("is-ready");
    setCurrentStep(conversationStep);
    connectionStatusText.textContent = "백엔드 연결됨";
    diarySubmitLabel.textContent = "저장 완료";
    showToast("오늘의 기록을 안전하게 저장했어요.");
    chatInput.focus();
  } catch {
    diaryError.textContent =
      "기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    diaryInput.setAttribute("aria-invalid", "true");
    diarySubmitLabel.textContent = "다시 저장하기";
    showToast("서버 연결을 확인해 주세요.");
  } finally {
    setSubmittingDiary(false);
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();

  if (!currentDiaryId || isSendingMessage) {
    return;
  }
  if (!message) {
    chatInput.focus();
    showToast("나누고 싶은 이야기를 먼저 적어주세요.");
    return;
  }

  appendMessage("나", message, "user");
  chatInput.value = "";
  setSendingMessage(true);
  const requestedDiaryId = currentDiaryId;

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/v1/conversations/${requestedDiaryId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          energy_level: energyLevel.value,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Conversation request failed with status ${response.status}`);
    }

    const reply = await response.json();
    if (currentDiaryId !== requestedDiaryId) {
      return;
    }
    if (!isConversationReply(reply)) {
      throw new Error("Backend returned an invalid conversation response");
    }
    appendMessage("천사", reply.angel, "angel");
    appendMessage("악마", reply.devil, "devil");
    appendMessage("진행자", reply.facilitator, "facilitator");

    if (reply.plan_ready) {
      renderPlan(reply.plan);
      showToast("내일의 계획을 정리하고 저장했어요.");
    }
    chatStatus.textContent = "계속 대화 가능";
  } catch {
    appendMessage(
      "안내",
      "답변을 불러오지 못했어요. 잠시 후 같은 내용을 다시 보내주세요.",
      "system",
    );
    showToast("대화 연결을 확인해 주세요.");
  } finally {
    setSendingMessage(false);
    chatInput.focus();
  }
});

setDates();
renderTasks();
