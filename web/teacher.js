import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const app = initializeApp({
  databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

const pageTitles = {}; // id → title

const classSelect = document.getElementById("classSelect");
const dayInput = document.getElementById("dayInput");
const loadBtn = document.getElementById("loadSchedule");
const scheduleList = document.getElementById("scheduleList");
const newPageIdInput = document.getElementById("newPageId");
const insertPosInput = document.getElementById("insertPosition");
const scheduleTableBody = document.querySelector("#scheduleTable tbody");

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
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.justifyContent = "space-between";

    const textSpan = document.createElement("span");
    textSpan.textContent = `#${i}: ${pageTitles[pageId]} (Hash:${pageId})`;

    const btnSpan = document.createElement("span");
    btnSpan.style.display = "flex";
    btnSpan.style.gap = "4px";

    const upBtn = document.createElement("button");
    upBtn.textContent = "↑";
    upBtn.onclick = () => moveItem(i, i - 1);

    const downBtn = document.createElement("button");
    downBtn.textContent = "↓";
    downBtn.onclick = () => moveItem(i, i + 1);

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = () => deleteItem(i);

    btnSpan.appendChild(upBtn);
    btnSpan.appendChild(downBtn);
    btnSpan.appendChild(delBtn);

    li.appendChild(textSpan);
    li.appendChild(btnSpan);
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

loadBtn.onclick = loadSchedule;

function getDateForDayIndex(dayIndex, classStartDate = "2024-08-19") {
  // Example: classStartDate is a Monday in ISO format
  const start = new Date(classStartDate);
  const date = new Date(start);
  date.setDate(start.getDate() + Number(dayIndex));
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long"
  });
  return `${date.toLocaleDateString()} (${weekday})`;
}

async function loadFullSchedule() {
  const classId = classSelect.value;
  // Fetch all days for this class
  const snap = await get(ref(db, `schedule/${classId}`));
  const schedule = snap.val() || {};
  renderScheduleTable(schedule);
}

async function renderScheduleTable(schedule) {
  scheduleTableBody.innerHTML = "";
  const dayIndexes = Object.keys(schedule).map(Number).sort((a, b) => a - b);
  const maxDayIndex = dayIndexes.length > 0 ? Math.max(...dayIndexes) : 0;

  // Helper to insert a new day at a given index
  async function insertDayAt(index) {
    const classId = classSelect.value;
    // Shift all days >= index up by 1
    for (let i = maxDayIndex; i >= index; i--) {
      const fromRef = ref(db, `schedule/${classId}/${i}`);
      const toRef = ref(db, `schedule/${classId}/${i + 1}`);
      const snap = await get(fromRef);
      if (snap.exists()) {
        await set(toRef, snap.val());
      } else {
        await set(toRef, []);
      }
    }
    // Set the new day to empty
    await set(ref(db, `schedule/${classId}/${index}`), []);
    loadFullSchedule();
  }

  for (let dayIndex = 0; dayIndex <= maxDayIndex; dayIndex++) {
    // --- Insert Day Button (before each row except the first) ---
    if (dayIndex > 0) {
      const insertRow = document.createElement("tr");
      const insertTd = document.createElement("td");
      insertTd.colSpan = 3;
      insertTd.style.textAlign = "center";
      insertTd.style.padding = "2px";
      const insertBtn = document.createElement("button");
      insertBtn.textContent = "+ Insert Day Here";
      insertBtn.style.fontSize = "0.9em";
      insertBtn.onclick = () => insertDayAt(dayIndex);
      insertTd.appendChild(insertBtn);
      insertRow.appendChild(insertTd);
      scheduleTableBody.appendChild(insertRow);
    }

    // --- Normal Day Row ---
    const lessons = schedule[dayIndex] || [];
    const tr = document.createElement("tr");

    // Day Index
    const tdDay = document.createElement("td");
    tdDay.textContent = dayIndex;
    tr.appendChild(tdDay);

    // Lessons (horizontal buttons or just a plus if empty)
    const tdLessons = document.createElement("td");
    tdLessons.style.display = "flex";
    tdLessons.style.flexWrap = "nowrap";
    tdLessons.style.alignItems = "center";
    tdLessons.style.gap = "4px";

    for (let i = 0; i < lessons.length; i++) {
      const lessonHash = lessons[i];

      // Cluster container (outer box)
      const cluster = document.createElement("span");
      cluster.style.display = "inline-flex";
      cluster.style.flexDirection = "column";
      cluster.style.alignItems = "center";
      cluster.style.justifyContent = "center";
      cluster.style.border = "2px solid #888";
      cluster.style.borderRadius = "8px";
      cluster.style.padding = "4px 6px";
      cluster.style.marginRight = "6px";
      cluster.style.background = "#f8f8f8";
      cluster.style.boxShadow = "1px 1px 3px #ddd";

      // Make cluster draggable
      cluster.draggable = true;
      cluster.style.cursor = "grab";
      cluster.dataset.lessonHash = lessonHash;
      cluster.dataset.dayIndex = dayIndex;
      cluster.dataset.lessonIndex = i;

      // Drag events
      cluster.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({
          lessonHash,
          fromDayIndex: dayIndex,
          fromLessonIndex: i
        }));
        // Optional: style for dragging
        cluster.style.opacity = "0.5";
      });
      cluster.addEventListener("dragend", () => {
        cluster.style.opacity = "1";
      });

      // Top row: Main lesson button
      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.justifyContent = "center";
      const mainBtn = document.createElement("button");
      mainBtn.textContent = await getLessonTitle(lessonHash);
      mainBtn.style.fontWeight = "bold";
      mainBtn.onclick = () => {
        window.location.href = `editor.html?page=${lessonHash}`;
      };
      topRow.appendChild(mainBtn);

      // Bottom row: left, right, delete
      const bottomRow = document.createElement("div");
      bottomRow.style.display = "flex";
      bottomRow.style.justifyContent = "center";
      bottomRow.style.gap = "2px";
      bottomRow.style.marginTop = "2px";

      // Left arrow
      const leftBtn = document.createElement("button");
      leftBtn.textContent = "←";
      leftBtn.disabled = i === 0;
      leftBtn.onclick = async () => {
        if (i > 0) {
          const classId = classSelect.value;
          const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
          const newLessons = [...lessons];
          [newLessons[i - 1], newLessons[i]] = [newLessons[i], newLessons[i - 1]];
          await set(dayRef, newLessons);
          loadFullSchedule();
        }
      };
      bottomRow.appendChild(leftBtn);

      // Right arrow
      const rightBtn = document.createElement("button");
      rightBtn.textContent = "→";
      rightBtn.disabled = i === lessons.length - 1;
      rightBtn.onclick = async () => {
        if (i < lessons.length - 1) {
          const classId = classSelect.value;
          const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
          const newLessons = [...lessons];
          [newLessons[i], newLessons[i + 1]] = [newLessons[i + 1], newLessons[i]];
          await set(dayRef, newLessons);
          loadFullSchedule();
        }
      };
      bottomRow.appendChild(rightBtn);

      // Delete button
      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑️";
      delBtn.onclick = async () => {
        const classId = classSelect.value;
        const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
        const newLessons = lessons.filter((_, idx) => idx !== i);
        await set(dayRef, newLessons);
        loadFullSchedule();
      };
      bottomRow.appendChild(delBtn);

      // Assemble cluster
      cluster.appendChild(topRow);
      cluster.appendChild(bottomRow);

      tdLessons.appendChild(cluster);
    }

    // "Link Lesson" button
    const linkBtn = document.createElement("button");
    linkBtn.textContent = "Link Lesson";
    linkBtn.style.width = "110px";
    linkBtn.style.minWidth = "110px";
    linkBtn.style.maxWidth = "110px";
    linkBtn.style.boxSizing = "border-box";
    linkBtn.onclick = async () => {
      // Fetch all lessons
      const snap = await get(ref(db, "content"));
      if (!snap.exists()) {
        alert("No lessons found.");
        return;
      }
      const contentMap = snap.val();
      // Create popup
      const popup = document.createElement("div");
      popup.style.position = "fixed";
      popup.style.top = "0";
      popup.style.left = "0";
      popup.style.width = "100vw";
      popup.style.height = "100vh";
      popup.style.background = "rgba(0,0,0,0.3)";
      popup.style.display = "flex";
      popup.style.alignItems = "center";
      popup.style.justifyContent = "center";
      popup.style.zIndex = "1000";

      const box = document.createElement("div");
      box.style.background = "#fff";
      box.style.padding = "24px";
      box.style.borderRadius = "8px";
      box.style.boxShadow = "0 2px 12px #0002";
      box.style.minWidth = "320px";
      box.style.maxWidth = "90vw";
      box.style.maxHeight = "80vh";
      box.style.overflowY = "auto";
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.gap = "8px";

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Close";
      closeBtn.style.alignSelf = "flex-end";
      closeBtn.onclick = () => document.body.removeChild(popup);

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search lessons by name...";
      searchInput.style.marginBottom = "8px";
      searchInput.style.padding = "4px";
      searchInput.style.fontSize = "1em";

      const resultsDiv = document.createElement("div");
      resultsDiv.style.display = "flex";
      resultsDiv.style.flexDirection = "column";
      resultsDiv.style.gap = "4px";
      resultsDiv.style.maxHeight = "50vh";
      resultsDiv.style.overflowY = "auto";

      // Helper: render results
      function renderResults(filter) {
        resultsDiv.innerHTML = "";
        const filterLower = filter.trim().toLowerCase();
        const items = Object.entries(contentMap)
          .map(([id, data]) => ({
            id,
            title: (data.title || "(Untitled)").toString()
          }))
          .filter(item => item.title.toLowerCase().includes(filterLower) || item.id.includes(filterLower))
          .sort((a, b) => a.title.localeCompare(b.title));
        if (items.length === 0) {
          const noRes = document.createElement("div");
          noRes.textContent = "No results.";
          resultsDiv.appendChild(noRes);
          return;
        }
        for (const item of items) {
          const btn = document.createElement("button");
          btn.textContent = `${item.title} (${item.id})`;
          btn.style.textAlign = "left";
          btn.style.whiteSpace = "normal";
          btn.style.width = "100%";
          btn.onclick = async () => {
            // Add to schedule
            const classId = classSelect.value;
            const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
            const snap = await get(dayRef);
            const lessons = snap.exists() ? snap.val() : [];
            lessons.push(item.id);
            await set(dayRef, lessons);
            document.body.removeChild(popup);
            loadFullSchedule();
          };
          resultsDiv.appendChild(btn);
        }
      }

      searchInput.oninput = () => renderResults(searchInput.value);
      renderResults("");

      box.appendChild(closeBtn);
      box.appendChild(searchInput);
      box.appendChild(resultsDiv);
      popup.appendChild(box);
      document.body.appendChild(popup);
    };

    // Insert the "Link Lesson" button before the "+ New Lesson" button
    tdLessons.appendChild(linkBtn);

    // Always add the "+ New Lesson" button
    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+ New Lesson";
    plusBtn.style.width = "110px"; // Fixed width
    plusBtn.style.minWidth = "110px";
    plusBtn.style.maxWidth = "110px";
    plusBtn.style.boxSizing = "border-box";
    plusBtn.onclick = () => addLessonToDay(dayIndex);
    tdLessons.appendChild(plusBtn);

    tdLessons.style.minHeight = "48px";
    tdLessons.style.flex = "1 1 auto";
    tdLessons.style.position = "relative";

    // Drop target events
    tdLessons.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      tdLessons.style.background = "#e0f7fa";
    });
    tdLessons.addEventListener("dragleave", (e) => {
      tdLessons.style.background = "";
    });
    tdLessons.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      tdLessons.style.background = "";
      let data;
      try {
        data = JSON.parse(e.dataTransfer.getData("text/plain"));
      } catch {
        return;
      }
      const { lessonHash, fromDayIndex, fromLessonIndex } = data;
      const toDayIndex = dayIndex;

      // Prevent dropping into the same day and position
      if (Number(fromDayIndex) === Number(toDayIndex)) return;

      // Remove from old day
      const classId = classSelect.value;
      const fromDayRef = ref(db, `schedule/${classId}/${fromDayIndex}`);
      const fromSnap = await get(fromDayRef);
      const fromLessons = fromSnap.exists() ? fromSnap.val() : [];
      fromLessons.splice(fromLessonIndex, 1);
      await set(fromDayRef, fromLessons);

      // Add to new day
      const toDayRef = ref(db, `schedule/${classId}/${toDayIndex}`);
      const toSnap = await get(toDayRef);
      const toLessons = toSnap.exists() ? toSnap.val() : [];
      toLessons.push(lessonHash);
      await set(toDayRef, toLessons);

      loadFullSchedule();
    });

    tr.appendChild(tdLessons);

    // Date column
    const tdDate = document.createElement("td");
    tdDate.textContent = getDateForDayIndex(dayIndex);
    tr.appendChild(tdDate);

    scheduleTableBody.appendChild(tr);
  }

  // --- Final row for the next day index ---
  const nextIndex = maxDayIndex + 1;
  const addRow = document.createElement("tr");

  // Day Index column
  const tdDay = document.createElement("td");
  tdDay.textContent = nextIndex;
  addRow.appendChild(tdDay);

  // Lessons column with "Link Lesson" and "+ New Lesson" buttons
  const tdLessons = document.createElement("td");
  tdLessons.style.display = "flex";
  tdLessons.style.flexWrap = "nowrap";
  tdLessons.style.alignItems = "center";
  tdLessons.style.gap = "4px";

  // "Link Lesson" button
  const linkBtn = document.createElement("button");
  linkBtn.textContent = "Link Lesson";
  linkBtn.style.width = "110px";
  linkBtn.style.minWidth = "110px";
  linkBtn.style.maxWidth = "110px";
  linkBtn.style.boxSizing = "border-box";
  linkBtn.onclick = async () => {
    // Fetch all lessons
    const snap = await get(ref(db, "content"));
    if (!snap.exists()) {
      alert("No lessons found.");
      return;
    }
    const contentMap = snap.val();
    // Create popup
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.width = "100vw";
    popup.style.height = "100vh";
    popup.style.background = "rgba(0,0,0,0.3)";
    popup.style.display = "flex";
    popup.style.alignItems = "center";
    popup.style.justifyContent = "center";
    popup.style.zIndex = "1000";

    const box = document.createElement("div");
    box.style.background = "#fff";
    box.style.padding = "24px";
    box.style.borderRadius = "8px";
    box.style.boxShadow = "0 2px 12px #0002";
    box.style.minWidth = "320px";
    box.style.maxWidth = "90vw";
    box.style.maxHeight = "80vh";
    box.style.overflowY = "auto";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.gap = "8px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.alignSelf = "flex-end";
    closeBtn.onclick = () => document.body.removeChild(popup);

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search lessons by name...";
    searchInput.style.marginBottom = "8px";
    searchInput.style.padding = "4px";
    searchInput.style.fontSize = "1em";

    const resultsDiv = document.createElement("div");
    resultsDiv.style.display = "flex";
    resultsDiv.style.flexDirection = "column";
    resultsDiv.style.gap = "4px";
    resultsDiv.style.maxHeight = "50vh";
    resultsDiv.style.overflowY = "auto";

    // Helper: render results
    function renderResults(filter) {
      resultsDiv.innerHTML = "";
      const filterLower = filter.trim().toLowerCase();
      const items = Object.entries(contentMap)
        .map(([id, data]) => ({
          id,
          title: (data.title || "(Untitled)").toString()
        }))
        .filter(item => item.title.toLowerCase().includes(filterLower) || item.id.includes(filterLower))
        .sort((a, b) => a.title.localeCompare(b.title));
      if (items.length === 0) {
        const noRes = document.createElement("div");
        noRes.textContent = "No results.";
        resultsDiv.appendChild(noRes);
        return;
      }
      for (const item of items) {
        const btn = document.createElement("button");
        btn.textContent = `${item.title} (${item.id})`;
        btn.style.textAlign = "left";
        btn.style.whiteSpace = "normal";
        btn.style.width = "100%";
        btn.onclick = async () => {
          // Add to schedule
          const classId = classSelect.value;
          const dayRef = ref(db, `schedule/${classId}/${nextIndex}`);
          const snap = await get(dayRef);
          const lessons = snap.exists() ? snap.val() : [];
          lessons.push(item.id);
          await set(dayRef, lessons);
          document.body.removeChild(popup);
          loadFullSchedule();
        };
        resultsDiv.appendChild(btn);
      }
    }

    searchInput.oninput = () => renderResults(searchInput.value);
    renderResults("");

    box.appendChild(closeBtn);
    box.appendChild(searchInput);
    box.appendChild(resultsDiv);
    popup.appendChild(box);
    document.body.appendChild(popup);
  };
  tdLessons.appendChild(linkBtn);

  // "+ New Lesson" button
  const plusBtn = document.createElement("button");
  plusBtn.textContent = "+ New Lesson";
  plusBtn.style.width = "110px";
  plusBtn.style.minWidth = "110px";
  plusBtn.style.maxWidth = "110px";
  plusBtn.style.boxSizing = "border-box";
  plusBtn.onclick = () => addLessonToDay(nextIndex);
  tdLessons.appendChild(plusBtn);

  addRow.appendChild(tdLessons);

  // Date column
  const tdDate = document.createElement("td");
  tdDate.textContent = getDateForDayIndex(nextIndex);
  addRow.appendChild(tdDate);

  scheduleTableBody.appendChild(addRow);
}

async function getLessonTitle(hash) {
  if (pageTitles[hash]) return pageTitles[hash];
  const snap = await get(ref(db, `content/${hash}/title`));
  pageTitles[hash] = snap.exists() ? snap.val() : "(Untitled)";
  return pageTitles[hash];
}

async function addLessonToDay(dayIndex) {
  // 1. Generate a unique hash for the new lesson
  let hash;
  let exists = true;
  while (exists) {
    hash = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const snap = await get(ref(db, `content/${hash}`));
    exists = snap.exists();
  }

  // 2. Create a blank lesson in the database
  await set(ref(db, `content/${hash}`), {
    title: "Empty Lesson"
  });

  // 3. Add the new lesson hash to the schedule for the given day
  const classId = classSelect.value;
  const dayRef = ref(db, `schedule/${classId}/${dayIndex}`);
  const snap = await get(dayRef);
  const lessons = snap.exists() ? snap.val() : [];
  lessons.push(hash);
  await set(dayRef, lessons);

  // 4. Reload the table to show the new lesson
  loadFullSchedule();
}

classSelect.onchange = loadFullSchedule;

// Initial load
loadClasses().then(loadFullSchedule);