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
const assignmentNumberInput = document.getElementById("assignmentNumberInput");
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

  // 古い保存データには assignmentNumber がないので、1を補います。
  return classes.map((classItem) => ({
    ...classItem,
    assignmentNumber: Number(classItem.assignmentNumber) || 1
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
        done: false,
        lastResetDate: ""
      };
    }

    // 授業の曜日が来て、まだ今日リセットしていなければ「未」に戻します。
    if (
      classItem.weekday === todayWeekday &&
      state[classItem.id].lastResetDate !== todayKey
    ) {
      if (state[classItem.id].done) {
        classItem.assignmentNumber += 1;
      }

      state[classItem.id].done = false;
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

    return first.name.localeCompare(second.name, "ja");
  });
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
    const classState = state[classItem.id] || { done: false, lastResetDate: "" };
    const button = document.createElement("button");
    const status = document.createElement("span");
    const text = document.createElement("span");
    const name = document.createElement("span");
    const number = document.createElement("span");
    const weekday = document.createElement("span");

    button.type = "button";
    button.className = classState.done ? "task-button is-done" : "task-button is-todo";
    button.setAttribute("aria-pressed", String(classState.done));

    status.className = "status";
    status.textContent = classState.done ? "済" : "未";

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
          done: false,
          lastResetDate: getTodayKey()
        };
      }

      latestState[classItem.id].done = !latestState[classItem.id].done;
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
    const numberLabel = document.createElement("label");
    const numberText = document.createElement("span");
    const numberInput = document.createElement("input");
    const deleteButton = document.createElement("button");

    row.className = "class-row";
    info.className = "class-info";

    name.textContent = classItem.name;
    weekday.textContent = `${weekdayNames[classItem.weekday]}曜 / 第${classItem.assignmentNumber}回`;

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
    numberLabel.appendChild(numberText);
    numberLabel.appendChild(numberInput);
    row.appendChild(info);
    row.appendChild(numberLabel);
    row.appendChild(deleteButton);
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
    assignmentNumber: Math.max(1, Number(assignmentNumberInput.value) || 1)
  };

  classes.push(newClass);
  saveClasses(classes);

  classNameInput.value = "";
  assignmentNumberInput.value = "1";
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
