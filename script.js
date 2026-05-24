// 曜日は JavaScript の Date#getDay() に合わせます。
// 0: 日曜, 1: 月曜, 2: 火曜, 3: 水曜, 4: 木曜, 5: 金曜, 6: 土曜
const defaultClasses = [];

const STATE_STORAGE_KEY = "assignment-checker-state-v2";
const CLASS_STORAGE_KEY = "assignment-checker-classes-v2";
const weekdayNames = ["日", "月", "火", "水", "木", "金", "土"];

const taskList = document.getElementById("taskList");
const todayText = document.getElementById("todayText");
const editToggleButton = document.getElementById("editToggleButton");
const editPanel = document.getElementById("editPanel");
const classForm = document.getElementById("classForm");
const classNameInput = document.getElementById("classNameInput");
const weekdaySelect = document.getElementById("weekdaySelect");
const periodInput = document.getElementById("periodInput");
const assignmentNumberInput = document.getElementById("assignmentNumberInput");
const completeStepInput = document.getElementById("completeStepInput");
const classList = document.getElementById("classList");
let currentDateKey = getTodayKey();

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadJson(key, fallbackValue) {
  const savedText = localStorage.getItem(key);

  // 初回起動時や保存データが壊れている時は、初期値から始めます。
  if (!savedText) {
    return fallbackValue;
  }

  try {
    return JSON.parse(savedText);
  } catch (error) {
    return fallbackValue;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadClasses() {
  const classes = loadJson(CLASS_STORAGE_KEY, defaultClasses);

  // 古い保存データには新しい項目がないので、初期値を補います。
  return classes.map((classItem) => ({
    ...classItem,
    period: Number(classItem.period) || 1,
    assignmentNumber: Number(classItem.assignmentNumber) || 1,
    useCompleteStep: Boolean(classItem.useCompleteStep)
  }));
}

function saveClasses(classes) {
  saveJson(CLASS_STORAGE_KEY, classes);
}

function loadState() {
  return loadJson(STATE_STORAGE_KEY, {});
}

function saveState(state) {
  saveJson(STATE_STORAGE_KEY, state);
}

function resetTodayClasses(classes, state) {
  const today = new Date();
  const todayWeekday = today.getDay();
  const todayKey = getTodayKey();

  classes.forEach((classItem) => {
    if (!state[classItem.id]) {
      state[classItem.id] = {
        status: "todo",
        lastResetDate: ""
      };
    }

    if (!state[classItem.id].status) {
      state[classItem.id].status = state[classItem.id].done ? "done" : "todo";
      delete state[classItem.id].done;
    }

    // 授業の曜日が来て、まだ今日リセットしていなければ「未」に戻します。
    if (
      classItem.weekday === todayWeekday &&
      state[classItem.id].lastResetDate !== todayKey
    ) {
      if (state[classItem.id].status === "done") {
        classItem.assignmentNumber += 1;
      }

      state[classItem.id].status = "todo";
      state[classItem.id].lastResetDate = todayKey;
    }
  });

  saveClasses(classes);
  saveState(state);
}

function getSortedClasses(classes) {
  const today = new Date();
  const todayWeekday = today.getDay();

  return classes.slice().sort((first, second) => {
    const firstDistance = (first.weekday - todayWeekday + 7) % 7;
    const secondDistance = (second.weekday - todayWeekday + 7) % 7;

    if (firstDistance !== secondDistance) {
      return firstDistance - secondDistance;
    }

    if (first.period !== second.period) {
      return first.period - second.period;
    }

    return first.name.localeCompare(second.name, "ja");
  });
}

function getClassStatus(classState) {
  if (classState.status) {
    return classState.status;
  }

  return classState.done ? "done" : "todo";
}

function getNextStatus(currentStatus, classItem) {
  if (classItem.useCompleteStep) {
    if (currentStatus === "todo") {
      return "complete";
    }

    if (currentStatus === "complete") {
      return "done";
    }

    return "todo";
  }

  return currentStatus === "done" ? "todo" : "done";
}

function getStatusText(status) {
  if (status === "complete") {
    return "完";
  }

  return status === "done" ? "済" : "未";
}

function renderTasks(classes, state) {
  const today = new Date();
  const todayWeekday = today.getDay();
  const sortedClasses = getSortedClasses(classes);

  todayText.textContent = `${getTodayKey()}（${weekdayNames[todayWeekday]}）`;
  taskList.innerHTML = "";

  if (sortedClasses.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty";
    emptyMessage.textContent = "授業がまだ登録されていません";
    taskList.appendChild(emptyMessage);
    return;
  }

  sortedClasses.forEach((classItem) => {
    const classState = state[classItem.id] || { status: "todo", lastResetDate: "" };
    const statusValue = getClassStatus(classState);
    const button = document.createElement("button");
    const status = document.createElement("span");
    const text = document.createElement("span");
    const name = document.createElement("span");
    const number = document.createElement("span");
    const weekday = document.createElement("span");

    button.type = "button";
    button.className = `task-button is-${statusValue}`;
    button.setAttribute("aria-pressed", String(statusValue !== "todo"));

    status.className = "status";
    status.textContent = getStatusText(statusValue);

    name.className = "class-name";
    name.textContent = classItem.name;

    number.className = "assignment-number";
    number.textContent = `第${classItem.assignmentNumber}回`;

    weekday.className = "task-weekday";
    weekday.textContent = `${weekdayNames[classItem.weekday]}曜`;

    button.appendChild(status);
    text.appendChild(name);
    text.appendChild(number);
    button.appendChild(text);
    button.appendChild(weekday);

    button.addEventListener("click", () => {
      const latestState = loadState();

      if (!latestState[classItem.id]) {
        latestState[classItem.id] = {
          status: "todo",
          lastResetDate: getTodayKey()
        };
      }

      latestState[classItem.id].status = getNextStatus(
        getClassStatus(latestState[classItem.id]),
        classItem
      );
      delete latestState[classItem.id].done;
      saveState(latestState);
      render();
    });

    taskList.appendChild(button);
  });
}

function renderClassList(classes) {
  const sortedClasses = getSortedClasses(classes);

  classList.innerHTML = "";

  if (sortedClasses.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty";
    emptyMessage.textContent = "授業がまだ登録されていません";
    classList.appendChild(emptyMessage);
    return;
  }

  sortedClasses.forEach((classItem) => {
    const row = document.createElement("div");
    const info = document.createElement("div");
    const name = document.createElement("strong");
    const weekday = document.createElement("span");
    const controls = document.createElement("div");
    const periodLabel = document.createElement("label");
    const periodText = document.createElement("span");
    const periodEditInput = document.createElement("input");
    const numberLabel = document.createElement("label");
    const numberText = document.createElement("span");
    const numberInput = document.createElement("input");
    const stepLabel = document.createElement("label");
    const stepInput = document.createElement("input");
    const stepText = document.createElement("span");
    const deleteButton = document.createElement("button");

    row.className = "class-row";
    info.className = "class-info";
    controls.className = "class-controls";

    name.textContent = classItem.name;
    weekday.textContent = `${weekdayNames[classItem.weekday]}曜 / ${classItem.period}限 / 第${classItem.assignmentNumber}回`;

    periodLabel.className = "small-edit";
    periodText.textContent = "何限";
    periodEditInput.type = "number";
    periodEditInput.min = "1";
    periodEditInput.step = "1";
    periodEditInput.value = classItem.period;

    periodEditInput.addEventListener("change", () => {
      const latestClasses = loadClasses();
      const targetClass = latestClasses.find((item) => item.id === classItem.id);

      if (!targetClass) {
        return;
      }

      targetClass.period = Math.max(1, Number(periodEditInput.value) || 1);
      saveClasses(latestClasses);
      render();
    });

    numberLabel.className = "number-edit";
    numberText.textContent = "第何回";
    numberInput.type = "number";
    numberInput.min = "1";
    numberInput.step = "1";
    numberInput.value = classItem.assignmentNumber;

    numberInput.addEventListener("change", () => {
      const latestClasses = loadClasses();
      const targetClass = latestClasses.find((item) => item.id === classItem.id);

      if (!targetClass) {
        return;
      }

      targetClass.assignmentNumber = Math.max(1, Number(numberInput.value) || 1);
      saveClasses(latestClasses);
      render();
    });

    stepLabel.className = "step-edit";
    stepInput.type = "checkbox";
    stepInput.checked = classItem.useCompleteStep;
    stepText.textContent = "完";

    stepInput.addEventListener("change", () => {
      const latestClasses = loadClasses();
      const latestState = loadState();
      const targetClass = latestClasses.find((item) => item.id === classItem.id);

      if (!targetClass) {
        return;
      }

      targetClass.useCompleteStep = stepInput.checked;

      if (!stepInput.checked && getClassStatus(latestState[classItem.id] || {}) === "complete") {
        latestState[classItem.id].status = "todo";
      }

      saveClasses(latestClasses);
      saveState(latestState);
      render();
    });

    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "削除";

    deleteButton.addEventListener("click", () => {
      const latestClasses = loadClasses();
      const latestState = loadState();
      const nextClasses = latestClasses.filter((item) => item.id !== classItem.id);

      delete latestState[classItem.id];
      saveClasses(nextClasses);
      saveState(latestState);
      render();
    });

    info.appendChild(name);
    info.appendChild(weekday);
    periodLabel.appendChild(periodText);
    periodLabel.appendChild(periodEditInput);
    numberLabel.appendChild(numberText);
    numberLabel.appendChild(numberInput);
    stepLabel.appendChild(stepInput);
    stepLabel.appendChild(stepText);
    row.appendChild(info);
    controls.appendChild(periodLabel);
    controls.appendChild(numberLabel);
    controls.appendChild(stepLabel);
    controls.appendChild(deleteButton);
    row.appendChild(controls);
    classList.appendChild(row);
  });
}

function render() {
  const classes = loadClasses();
  const state = loadState();

  resetTodayClasses(classes, state);
  renderTasks(classes, state);
  renderClassList(classes);
}

editToggleButton.addEventListener("click", () => {
  const isOpen = !editPanel.hidden;

  editPanel.hidden = isOpen;
  editToggleButton.setAttribute("aria-expanded", String(!isOpen));
  editToggleButton.textContent = isOpen ? "授業を編集" : "閉じる";
});

classForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const className = classNameInput.value.trim();

  if (!className) {
    return;
  }

  const classes = loadClasses();
  const newClass = {
    id: `class-${Date.now()}`,
    name: className,
    weekday: Number(weekdaySelect.value),
    period: Math.max(1, Number(periodInput.value) || 1),
    assignmentNumber: Math.max(1, Number(assignmentNumberInput.value) || 1),
    useCompleteStep: completeStepInput.checked
  };

  classes.push(newClass);
  saveClasses(classes);

  classNameInput.value = "";
  periodInput.value = "1";
  assignmentNumberInput.value = "1";
  completeStepInput.checked = false;
  render();
});

// 画面を開きっぱなしにしていても、日付が変わったら並び順とリセットを更新します。
setInterval(() => {
  const nextDateKey = getTodayKey();

  if (nextDateKey !== currentDateKey) {
    currentDateKey = nextDateKey;
    render();
  }
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    currentDateKey = getTodayKey();
    render();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

render();
