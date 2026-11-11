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

const tasks = [];
let nextTaskId = 1;
let toastTimer;

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
  renderTasks();
  taskInput.focus();
});

diaryInput.addEventListener("input", () => {
  diaryCount.textContent = `${diaryInput.value.length.toLocaleString("ko-KR")} / 2,000`;

  if (diaryError.textContent) {
    diaryError.textContent = "";
    diaryInput.removeAttribute("aria-invalid");
  }
});

diaryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const diaryText = diaryInput.value.trim();

  if (diaryText.length < 10) {
    diaryError.textContent = "일기를 10자 이상 적어주세요.";
    diaryInput.setAttribute("aria-invalid", "true");
    diaryInput.focus();
    return;
  }

  diaryError.textContent = "";
  diaryInput.removeAttribute("aria-invalid");
  planPlaceholder.classList.add("is-ready");
  planPlaceholder.querySelector("h3").textContent = "오늘의 기록이 준비됐어요.";
  planPlaceholder.querySelector("p").textContent =
    "백엔드 연결 단계가 끝나면 이 기록을 보내고, 내일의 계획을 위한 대화를 시작합니다.";
  chatStatus.textContent = "기록 준비됨";
  chatStatus.classList.add("is-ready");
  showToast("오늘의 기록을 확인했어요. 아직 서버로 보내지는 않았습니다.");
});

document.querySelector("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
});

setDates();
renderTasks();
