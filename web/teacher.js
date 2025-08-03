import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getDatabase, ref, get, set, update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const app = initializeApp({ 
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

const pageTitles = {};  // id → title

const classSelect = document.getElementById("classSelect");
const dayInput = document.getElementById("dayInput");
const loadBtn = document.getElementById("loadSchedule");
const scheduleList = document.getElementById("scheduleList");
const newPageIdInput = document.getElementById("newPageId");
const insertPosInput = document.getElementById("insertPosition");
const insertBtn = document.getElementById("insertBtn");

let currentClassId = "";
let currentSchedule = [];

async function loadClasses() {
  const snap = await get(ref(db, "classes"));
  const classes = snap.val();
  Object.entries(classes)
    .sort(([, a], [, b]) => a.displayOrder - b.displayOrder)
    .forEach(([id, data]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = data.name;
      classSelect.appendChild(option);
    });
}

async function loadSchedule() {
  currentClassId = classSelect.value;
  const dayIndex = dayInput.value;
  const snap = await get(ref(db, `schedule/${currentClassId}/${dayIndex}`));
  currentSchedule = snap.val() || [];

  renderScheduleList();
}

async function renderScheduleList() {
  scheduleList.innerHTML = "";

  for (let i = 0; i < currentSchedule.length; i++) {
    const pageId = currentSchedule[i];

    if (!pageTitles[pageId]) {
      const snap = await get(ref(db, `content/${pageId}/title`));
      pageTitles[pageId] = snap.exists() ? snap.val() : "(Untitled)";
    }

    const li = document.createElement("li");
    li.textContent = `#${i}: ${pageTitles[pageId]} (Hash:${pageId})`;

    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.onclick = () => moveItem(i, i - 1);

    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.onclick = () => moveItem(i, i + 1);

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = () => deleteItem(i);

    li.appendChild(upBtn);
    li.appendChild(downBtn);
    li.appendChild(delBtn);
    scheduleList.appendChild(li);
  }
}


async function updateScheduleInDB() {
  const dayIndex = dayInput.value;
  const path = `schedule/${currentClassId}/${dayIndex}`;
  await set(ref(db, path), currentSchedule);
}

function moveItem(from, to) {
  if (to < 0 || to >= currentSchedule.length) return;
  const [moved] = currentSchedule.splice(from, 1);
  currentSchedule.splice(to, 0, moved);
  renderScheduleList();
  updateScheduleInDB();
}

function deleteItem(index) {
  currentSchedule.splice(index, 1);
  renderScheduleList();
  updateScheduleInDB();
}

insertBtn.onclick = async () => {
  const newId = newPageIdInput.value.trim();
  if (!newId) return alert("Enter a valid page ID.");

  const contentSnap = await get(ref(db, `content/${newId}`));
  if (!contentSnap.exists()) {
    alert(`Page "${newId}" does not exist.`);
    return;
  }

  const pos = insertPosInput.value ? parseInt(insertPosInput.value) : currentSchedule.length;
  const safePos = Math.max(0, Math.min(pos, currentSchedule.length));
  currentSchedule.splice(safePos, 0, newId);

  renderScheduleList();
  updateScheduleInDB();
};


loadBtn.onclick = loadSchedule;

loadClasses();
