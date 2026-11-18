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
const chatStatus = document.querySelector("#chat-status");
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
  isDiarySaved = false;
  if (!isSubmittingDiary) {
    diarySubmit.disabled = false;
    diarySubmitLabel.textContent = "오늘 기록 저장하기";
  }
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
    if (!result.persisted) {
      throw new Error("Backend did not confirm persistence");
    }

    isDiarySaved = true;
    planPlaceholder.classList.add("is-ready");
    planPlaceholder.querySelector("h3").textContent =
      "오늘의 기록을 저장했어요.";
    planPlaceholder.querySelector("p").textContent =
      "다음 단계에서 내일의 계획을 정리할 수 있어요.";
    chatStatus.textContent = "기록 저장됨";
    chatStatus.classList.add("is-ready");
    connectionStatusText.textContent = "백엔드 연결됨";
    diarySubmitLabel.textContent = "저장 완료";
    showToast("오늘의 기록을 안전하게 저장했어요.");
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

document.querySelector("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
});

setDates();
renderTasks();
